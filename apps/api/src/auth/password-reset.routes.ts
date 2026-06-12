import type { FastifyPluginAsync } from 'fastify'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { forgotPasswordSchema, resetPasswordSchema } from './password-reset.schema'
import { passwordResetEmail } from '../email/templates'

// Rotas de redefinição de senha — não exigem autenticação.
// O fluxo: o usuário informa o e-mail → recebe um link por e-mail →
// clica no link e cria uma nova senha.

export const passwordResetRoutes: FastifyPluginAsync = async (app) => {
  // Passo 1: o usuário informa o e-mail e recebe o link de redefinição.
  // Sempre retorna 200, mesmo que o e-mail não exista — assim ninguém
  // descobre quais e-mails estão cadastrados.
  app.post(
    '/forgot-password',
    { config: { rateLimit: { max: 3, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { email } = forgotPasswordSchema.parse(request.body)

      const user = await app.prisma.user.findUnique({
        where: { email },
        select: { id: true, storeId: true },
      })

      if (user) {
        // Busca o nome da loja para colocar no e-mail
        const store = await app.prisma.store.findUnique({
          where: { id: user.storeId },
          select: { name: true },
        })

        // Gera um token aleatório seguro (64 caracteres hex)
        const token = crypto.randomBytes(32).toString('hex')

        // Invalida tokens anteriores desse usuário (evita acúmulo)
        await app.prisma.passwordResetToken.deleteMany({
          where: { userId: user.id },
        })

        // Cria o token no banco — expira em 1 hora
        await app.prisma.passwordResetToken.create({
          data: {
            token,
            userId: user.id,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        })

        const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
        const resetUrl = `${frontendUrl}/admin/redefinir-senha?token=${token}`
        const storeName = store?.name ?? 'Sua loja'

        await app.email.send(
          email,
          'Redefinir sua senha — Esqueleton',
          passwordResetEmail(resetUrl, storeName),
        )
      }

      // Resposta idêntica com ou sem e-mail cadastrado
      return reply.status(200).send({
        message: 'Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.',
      })
    }
  )

  // Passo 2: o usuário clica no link, envia o token e a nova senha.
  app.post(
    '/reset-password',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { token, password } = resetPasswordSchema.parse(request.body)

      const resetToken = await app.prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: { select: { id: true } } },
      })

      // Token inexistente, já usado ou expirado — mesma mensagem genérica
      if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
        return reply.status(400).send({
          message: 'Link inválido ou expirado. Peça um novo link de redefinição de senha.',
        })
      }

      const hashed = await bcrypt.hash(password, 10)

      // Atualiza a senha e marca o token como usado — tudo na mesma transação
      await app.prisma.$transaction([
        app.prisma.user.update({
          where: { id: resetToken.userId },
          data: { password: hashed },
        }),
        app.prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() },
        }),
      ])

      return reply.status(200).send({
        message: 'Senha redefinida com sucesso. Faça login com a nova senha.',
      })
    }
  )
}
