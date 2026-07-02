import type { FastifyPluginAsync } from 'fastify'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { requireOwner } from '../../../domain/identity/guards/role.guard'
import { idParamSchema } from '../../../shared/validation/schemas'

// Gestão de usuários da loja — apenas o OWNER pode listar e remover membros da equipe.
// Criar novos usuários continua sendo feito pelo POST /api/auth/register (modo 2).

export const userAdminRoutes: FastifyPluginAsync = async (app) => {
  // Todas as rotas exigem autenticação + ser OWNER
  app.addHook('preHandler', app.authenticate)
  app.addHook('preHandler', requireOwner)

  // Lista todos os usuários da loja
  app.get('/', async (request) => {
    const users = await app.prisma.user.findMany({
      where: { storeId: request.user.storeId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        mustChangePassword: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return users
  })

  // Remove um membro da equipe — o OWNER não pode remover a si mesmo
  app.delete('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)

    // Não permite que o OWNER se remova
    if (id === request.user.sub) {
      return reply.status(400).send({
        message: 'Você não pode remover a si mesmo.',
      })
    }

    // Remove apenas se o usuário pertence à mesma loja
    const { count } = await app.prisma.user.deleteMany({
      where: { id, storeId: request.user.storeId },
    })

    if (count === 0) {
      return reply.status(404).send({ message: 'Usuário não encontrado' })
    }

    return reply.status(204).send()
  })

  // Reseta a senha de um membro da equipe — gera uma senha temporária aleatória
  // que o OWNER deve repassar ao membro. No próximo login, o membro será
  // obrigado a trocar a senha (mustChangePassword = true).
  app.post('/:id/reset-password', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)

    // Não permite resetar a própria senha por essa rota
    if (id === request.user.sub) {
      return reply.status(400).send({
        message: 'Use a opção "Alterar senha" para trocar a sua própria senha.',
      })
    }

    // Gera uma senha aleatória de 10 caracteres (letras e números)
    const temporaryPassword = crypto.randomBytes(5).toString('hex')
    const hashed = await bcrypt.hash(temporaryPassword, 10)

    const { count } = await app.prisma.user.updateMany({
      where: { id, storeId: request.user.storeId },
      data: { password: hashed, mustChangePassword: true },
    })

    if (count === 0) {
      return reply.status(404).send({ message: 'Usuário não encontrado' })
    }

    // Retorna a senha em texto para o OWNER repassar ao membro
    return { temporaryPassword }
  })
}
