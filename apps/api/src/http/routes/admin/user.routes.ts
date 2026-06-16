import type { FastifyPluginAsync } from 'fastify'
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
        role: true,
        emailVerified: true,
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
}
