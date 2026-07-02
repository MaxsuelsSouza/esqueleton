import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { passwordSchema } from './auth.routes'

// Troca de senha — duas situações:
//   1. Senha temporária (mustChangePassword = true): não exige a senha atual.
//   2. Troca voluntária: exige a senha atual para confirmar a identidade.
const changePasswordSchema = z.object({
  // Senha atual — obrigatória apenas se NÃO for troca obrigatória
  currentPassword: z.string().max(72).optional(),
  newPassword: passwordSchema,
})

export const changePasswordRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate)

  app.put(
    '/change-password',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { currentPassword, newPassword } = changePasswordSchema.parse(request.body)

      const user = await app.prisma.user.findFirst({
        where: { id: request.user.sub, storeId: request.user.storeId },
        select: { id: true, password: true, mustChangePassword: true },
      })
      if (!user) {
        return reply.status(404).send({ message: 'Usuário não encontrado' })
      }

      // Se NÃO é troca obrigatória, exige a senha atual
      if (!user.mustChangePassword) {
        if (!currentPassword) {
          return reply.status(400).send({ message: 'Senha atual é obrigatória' })
        }
        const valid = await bcrypt.compare(currentPassword, user.password)
        if (!valid) {
          return reply.status(400).send({ message: 'Senha atual incorreta' })
        }
      }

      const hashed = await bcrypt.hash(newPassword, 10)
      await app.prisma.user.updateMany({
        where: { id: user.id, storeId: request.user.storeId },
        data: { password: hashed, mustChangePassword: false },
      })

      return { message: 'Senha alterada com sucesso' }
    }
  )
}
