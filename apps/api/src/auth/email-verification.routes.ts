import type { FastifyPluginAsync } from 'fastify'
import crypto from 'crypto'
import { z } from 'zod'
import { emailVerificationEmail } from '../email/templates'

// Rotas de verificação de e-mail — confirma que o endereço do usuário é válido.

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
})

export const emailVerificationRoutes: FastifyPluginAsync = async (app) => {
  // Verifica o e-mail usando o token recebido no link (não exige login)
  app.post(
    '/verify-email',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { token } = verifyEmailSchema.parse(request.body)

      const verificationToken = await app.prisma.emailVerificationToken.findUnique({
        where: { token },
        select: { id: true, userId: true, expiresAt: true, usedAt: true, user: { select: { storeId: true } } },
      })

      // Token inexistente, já usado ou expirado — mesma mensagem genérica
      if (!verificationToken || verificationToken.usedAt || verificationToken.expiresAt < new Date()) {
        return reply.status(400).send({
          message: 'Link inválido ou expirado. Peça um novo link de verificação.',
        })
      }

      // Marca o e-mail como verificado e o token como usado
      await app.prisma.$transaction([
        app.prisma.user.update({
          where: { id: verificationToken.userId },
          data: { emailVerified: true },
        }),
        app.prisma.emailVerificationToken.update({
          where: { id: verificationToken.id },
          data: { usedAt: new Date() },
        }),
      ])

      // Lembra o lojista de ativar a assinatura — a loja funciona por 7 dias de
      // teste e depois sai do ar para os clientes. Fire and forget.
      app.prisma.notification.upsert({
        where: { storeId_type_entityId: { storeId: verificationToken.user.storeId, type: 'SUBSCRIPTION_REQUIRED', entityId: 'ativacao' } },
        create: {
          storeId: verificationToken.user.storeId,
          type: 'SUBSCRIPTION_REQUIRED',
          title: 'Ative sua assinatura para manter a loja no ar',
          body: 'Sua loja funciona por 7 dias de teste. Depois disso, só fica disponível para os clientes com a assinatura ativa.',
          entityId: 'ativacao',
        },
        update: {},
      }).catch(() => {})

      return reply.status(200).send({
        message: 'E-mail verificado com sucesso!',
      })
    }
  )

  // Reenvia o e-mail de verificação (exige login — o usuário já tem conta mas não verificou)
  app.post(
    '/resend-verification',
    {
      // skipEmailVerification: esta rota precisa funcionar mesmo após o bloqueio
      // de 7 dias — é justamente por ela que o usuário pede um novo link
      config: { rateLimit: { max: 2, timeWindow: '1 minute' }, skipEmailVerification: true },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      // Já verificado — não precisa reenviar
      if (request.user.emailVerified) {
        return reply.status(400).send({ message: 'E-mail já verificado.' })
      }

      const user = await app.prisma.user.findUnique({
        where: { id: request.user.sub },
        select: { id: true, email: true, storeId: true },
      })

      if (!user) {
        return reply.status(401).send({ message: 'Não autorizado. Faça login novamente.' })
      }

      const store = await app.prisma.store.findUnique({
        where: { id: user.storeId },
        select: { name: true },
      })

      // Invalida tokens anteriores e cria um novo
      await app.prisma.emailVerificationToken.deleteMany({
        where: { userId: user.id },
      })

      const token = crypto.randomBytes(32).toString('hex')

      await app.prisma.emailVerificationToken.create({
        data: {
          token,
          userId: user.id,
          // Token de verificação expira em 7 dias
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
      const verifyUrl = `${frontendUrl}/admin/verificar-email?token=${token}`
      const storeName = store?.name ?? 'Sua loja'

      await app.email.send(
        user.email,
        'Confirme seu e-mail — Esqueleton',
        emailVerificationEmail(verifyUrl, storeName),
      )

      return reply.status(200).send({
        message: 'Link de verificação enviado. Verifique sua caixa de entrada.',
      })
    }
  )
}
