import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { shortText, slugSchema } from '../common/validation'

const emailSchema = z.string().email('Email inválido').max(254, 'Email muito longo')

const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .max(72, 'Senha muito longa')

// Cadastro de uma loja nova — pede os dados da loja junto com os do usuário
const registerStoreSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  storeName: shortText(80, 'Nome da loja é obrigatório'),
  storeSlug: slugSchema,
})

// Cadastro de mais um usuário em uma loja que já existe (feito por um admin autenticado)
const registerUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha é obrigatória').max(72, 'Senha muito longa'),
})

// Hash falso usado quando o email não existe — mantém o tempo de resposta igual
// ao de uma senha errada, evitando que alguém descubra quais emails estão cadastrados
const FAKE_PASSWORD_HASH = bcrypt.hashSync('senha-que-nunca-confere', 10)

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Cadastro — funciona de duas formas:
  //   1. Sem token: cria uma LOJA NOVA junto com o primeiro usuário dela
  //      (é o cadastro público do SaaS — qualquer pessoa pode abrir a sua loja).
  //   2. Com token: um admin autenticado cria mais um usuário NA PRÓPRIA loja.
  app.post(
    '/register',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request, reply) => {
      // Descobre se quem chamou já está autenticado (modo 2)
      const isAuthenticated = await request
        .jwtVerify()
        .then(() => Boolean(request.user.storeId))
        .catch(() => false)

      if (isAuthenticated) {
        // ── Modo 2: novo usuário na loja de quem está autenticado ──
        const { email, password } = registerUserSchema.parse(request.body)

        const existing = await app.prisma.user.findUnique({ where: { email } })
        if (existing) {
          return reply.status(409).send({ message: 'Email já cadastrado' })
        }

        const hashed = await bcrypt.hash(password, 10)
        const user = await app.prisma.user.create({
          data: { email, password: hashed, storeId: request.user.storeId },
          select: { id: true, email: true, storeId: true, createdAt: true },
        })

        return reply.status(201).send(user)
      }

      // ── Modo 1: cadastro público — cria a loja e o primeiro usuário ──
      const { email, password, storeName, storeSlug } = registerStoreSchema.parse(request.body)

      const [existingUser, existingStore] = await Promise.all([
        app.prisma.user.findUnique({ where: { email } }),
        app.prisma.store.findUnique({ where: { slug: storeSlug } }),
      ])
      if (existingUser) {
        return reply.status(409).send({ message: 'Email já cadastrado' })
      }
      if (existingStore) {
        return reply.status(409).send({ message: 'Este endereço de loja já está em uso — escolha outro' })
      }

      const hashed = await bcrypt.hash(password, 10)

      // Loja, perfil e usuário nascem juntos — se qualquer parte falhar, nada é criado
      const result = await app.prisma.$transaction(async (tx) => {
        const store = await tx.store.create({
          data: { slug: storeSlug, name: storeName },
        })
        await tx.storeProfile.create({
          data: { storeId: store.id, storeName },
        })
        const user = await tx.user.create({
          data: { email, password: hashed, storeId: store.id },
          select: { id: true, email: true, storeId: true, createdAt: true },
        })
        return { store, user }
      })

      return reply.status(201).send({
        ...result.user,
        store: { slug: result.store.slug, name: result.store.name },
      })
    }
  )

  // Login — dois limites contra adivinhação de senha:
  //   1. Por IP (config abaixo): barra muitas tentativas vindas de um mesmo endereço.
  //   2. Por email (preHandler abaixo): barra ataques distribuídos — muitos IPs
  //      diferentes tentando senhas contra uma MESMA conta.
  app.post(
    '/login',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      preHandler: app.rateLimit({
        max: 10,
        timeWindow: '15 minutes',
        // Conta as tentativas pelo email informado, não pelo IP — em minúsculas,
        // para "Ana@loja.com" e "ana@loja.com" contarem como a mesma conta
        keyGenerator: (request) => {
          const body = request.body as { email?: unknown } | null
          const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
          // Sem email no corpo a validação rejeita a requisição de qualquer
          // forma — o IP serve apenas como chave reserva para o contador
          return email ? `email:${email}` : request.ip
        },
        // Registra no log quando uma conta passa do limite — ajuda a perceber ataques
        onExceeded: (request, key) => {
          app.log.warn({ key, ip: request.ip }, 'Limite de tentativas de login por conta excedido')
        },
        errorResponseBuilder: () => ({
          statusCode: 429,
          message: 'Muitas tentativas de login para esta conta. Aguarde alguns minutos e tente novamente.',
        }),
      }),
    },
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

      // O slug da loja volta na resposta para o painel montar o link "ver minha loja"
      const store = await app.prisma.store.findUnique({ where: { id: user.storeId } })
      if (!store) {
        app.log.error({ userId: user.id }, 'Usuário sem loja correspondente no banco')
        return reply.status(401).send({ message: 'Credenciais inválidas' })
      }

      // O token carrega a loja — toda consulta do admin usa o storeId do token
      const token = app.jwt.sign({ sub: user.id, email: user.email, storeId: user.storeId })
      return { token, store: { slug: store.slug, name: store.name } }
    }
  )
}
