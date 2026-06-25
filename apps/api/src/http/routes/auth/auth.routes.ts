import type { FastifyPluginAsync } from 'fastify'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { shortText, slugSchema, phoneSchema } from '../../../shared/validation/schemas'
import { requireOwner } from '../../../domain/identity/guards/role.guard'
import { emailVerificationEmail } from '../../../shared/email/templates'
import { registerStore, registerStaff } from '../../../domain/identity/services/auth.service'

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
  whatsapp: phoneSchema.describe('WhatsApp é obrigatório para receber pedidos'),
})

// Cadastro de mais um usuário em uma loja que já existe (feito por um admin autenticado)
const registerUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  // Nome opcional — identifica quem é o membro (ex: "João da logística")
  name: shortText(120).nullish().transform(v => v || undefined),
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
        // ── Modo 2: OWNER convida um novo membro para a equipe da loja ──
        // Apenas o dono da loja pode convidar novos membros
        await requireOwner(request, reply)
        if (reply.sent) return

        // Limite de usuários do plano — bloqueia o convite quando a equipe está cheia
        const limiteDeUsuarios = await app.planLimitStatus(request.user.storeId, 'maxUsers')
        if (limiteDeUsuarios?.reached) {
          return reply.status(403).send({
            message: 'Limite de usuários do plano foi atingido. Faça upgrade para convidar mais membros.',
            limit: limiteDeUsuarios.max,
            current: limiteDeUsuarios.current,
          })
        }

        const { email, password, name } = registerUserSchema.parse(request.body)

        const existing = await app.prisma.user.findUnique({ where: { email } })
        if (existing) {
          return reply.status(409).send({ message: 'Email já cadastrado' })
        }

        const hashed = await bcrypt.hash(password, 10)
        const user = await registerStaff(app.prisma, {
          email,
          hashedPassword: hashed,
          storeId: request.user.storeId,
          name,
        })

        return reply.status(201).send(user)
      }

      // ── Modo 1: cadastro público — cria a loja e o primeiro usuário ──
      const { email, password, storeName, storeSlug, whatsapp } = registerStoreSchema.parse(request.body)

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
      const result = await registerStore(app.prisma, {
        email,
        hashedPassword: hashed,
        storeName,
        storeSlug,
        whatsapp,
      })

      // Envia o e-mail de verificação (fora da transação — se falhar, a loja já foi criada)
      try {
        const verificationToken = crypto.randomBytes(32).toString('hex')
        await app.prisma.emailVerificationToken.create({
          data: {
            token: verificationToken,
            userId: result.user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        })

        const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
        const verifyUrl = `${frontendUrl}/admin/verificar-email?token=${verificationToken}`
        await app.email.send(
          email,
          'Confirme seu e-mail — Esqueleton',
          emailVerificationEmail(verifyUrl, storeName),
        )
      } catch (emailError) {
        // Falha no envio do e-mail não deve impedir o cadastro
        app.log.error({ emailError, email }, 'Falha ao enviar e-mail de verificação no cadastro')
      }

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

      const user = await app.prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, password: true, storeId: true, role: true, emailVerified: true, isSuperAdmin: true },
      })
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

      // O token carrega a loja e o papel — toda consulta do admin usa o storeId do token
      const token = app.jwt.sign({
        sub: user.id,
        email: user.email,
        storeId: user.storeId,
        role: user.role,
        emailVerified: user.emailVerified,
        isSuperAdmin: user.isSuperAdmin,
      })
      return {
        token,
        role: user.role,
        emailVerified: user.emailVerified,
        isSuperAdmin: user.isSuperAdmin,
        store: { slug: store.slug, name: store.name },
      }
    }
  )
}
