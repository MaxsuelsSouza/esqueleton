// Rotas de notificações — todas exigem login; cada admin vê apenas as da própria loja
import type { FastifyInstance } from 'fastify'
import { idParamSchema } from '../../../shared/validation/schemas'
import { checkExpiredEntities } from '../../../domain/notification/services/notification.service'

export async function notificationRoutes(app: FastifyInstance) {
  // Todas as rotas deste grupo exigem login
  app.addHook('preHandler', app.authenticate)

  // GET /api/notifications — lista todas as notificações da loja, mais recentes primeiro
  app.get('/', async (request, reply) => {
    const storeId = request.user.storeId
    const [notifications, unreadCount] = await Promise.all([
      app.prisma.notification.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } }),
      app.prisma.notification.count({ where: { storeId, status: 'PENDING' } }),
    ])
    return reply.send({ notifications, unreadCount })
  })

  // PATCH /api/notifications/:id/read — marca uma notificação como lida
  app.patch('/:id/read', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const { count } = await app.prisma.notification.updateMany({
      where: { id, storeId: request.user.storeId },
      data: { status: 'READ' },
    })
    if (count === 0) {
      return reply.status(404).send({ message: 'Notificação não encontrada.' })
    }
    return reply.send({ message: 'Notificação marcada como lida.' })
  })

  // PATCH /api/notifications/read-all — marca todas as notificações da loja como lidas
  app.patch('/read-all', async (request, reply) => {
    await app.prisma.notification.updateMany({
      where: { storeId: request.user.storeId, status: 'PENDING' },
      data: { status: 'READ' },
    })
    return reply.send({ message: 'Todas as notificações marcadas como lidas.' })
  })

  // DELETE /api/notifications/:id — remove uma notificação
  app.delete('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const { count } = await app.prisma.notification.deleteMany({
      where: { id, storeId: request.user.storeId },
    })
    if (count === 0) {
      return reply.status(404).send({ message: 'Notificação não encontrada.' })
    }
    return reply.status(204).send()
  })

  // POST /api/notifications/check-expiry — verifica promoções, cupons e destaques expirados
  // Chamado pelo frontend quando o admin abre a página de notificações
  app.post('/check-expiry', async (request, reply) => {
    const created = await checkExpiredEntities(app.prisma, request.user.storeId)
    return reply.send({ created })
  })
}
