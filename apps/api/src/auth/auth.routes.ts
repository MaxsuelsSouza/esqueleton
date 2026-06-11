import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('Email inválido').max(254, 'Email muito longo'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(72, 'Senha muito longa'),
})

const loginSchema = z.object({
  email: z.string().email('Email inválido').max(254, 'Email muito longo'),
  password: z.string().min(1, 'Senha é obrigatória').max(72, 'Senha muito longa'),
})

// Hash falso usado quando o email não existe — mantém o tempo de resposta igual
// ao de uma senha errada, evitando que alguém descubra quais emails estão cadastrados
const FAKE_PASSWORD_HASH = bcrypt.hashSync('senha-que-nunca-confere', 10)

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Cadastro de administrador.
  // O primeiro usuário pode ser criado livremente (para configurar a loja).
  // Depois disso, apenas um administrador já autenticado pode criar novas contas —
  // sem essa trava, qualquer pessoa criaria uma conta e teria acesso total ao painel.
  app.post(
    '/register',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { email, password } = registerSchema.parse(request.body)

      const totalUsers = await app.prisma.user.count()
      if (totalUsers > 0) {
        try {
          await request.jwtVerify()
        } catch {
          return reply
            .status(403)
            .send({ message: 'Cadastro permitido apenas para administradores autenticados' })
        }
      }

      const existing = await app.prisma.user.findUnique({ where: { email } })
      if (existing) {
        return reply.status(409).send({ message: 'Email já cadastrado' })
      }

      const hashed = await bcrypt.hash(password, 10)
      const user = await app.prisma.user.create({
        data: { email, password: hashed },
        select: { id: true, email: true, createdAt: true },
      })

      return reply.status(201).send(user)
    }
  )

  // Login — limite rígido por IP para impedir tentativas de adivinhar a senha
  app.post(
    '/login',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { email, password } = loginSchema.parse(request.body)

      const user = await app.prisma.user.findUnique({ where: { email } })
      if (!user) {
        // Compara contra um hash falso para o tempo de resposta não revelar se o email existe
        await bcrypt.compare(password, FAKE_PASSWORD_HASH)
        // Registra a tentativa no log — ajuda a perceber ataques de adivinhação de senha
        app.log.warn({ email, ip: request.ip }, 'Tentativa de login com email não cadastrado')
        return reply.status(401).send({ message: 'Credenciais inválidas' })
      }

      const valid = await bcrypt.compare(password, user.password)
      if (!valid) {
        app.log.warn({ email, ip: request.ip }, 'Tentativa de login com senha incorreta')
        return reply.status(401).send({ message: 'Credenciais inválidas' })
      }

      const token = app.jwt.sign({ sub: user.id, email: user.email })
      return { token }
    }
  )
}
