// Rotas de notificações — todas exigem login; cada admin vê apenas as da própria loja
import type { FastifyInstance } from 'fastify'
import { idParamSchema } from '../common/validation'

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
    const storeId = request.user.storeId
    const now = new Date()
    // Data e hora no formato UTC — mesmo formato armazenado no banco ("YYYY-MM-DD" e "HH:MM")
    const today = now.toISOString().slice(0, 10)
    const currentTime = now.toISOString().slice(11, 16)

    const [promotions, coupons, featured] = await Promise.all([
      app.prisma.promotion.findMany({ where: { storeId, active: true } }),
      app.prisma.coupon.findMany({ where: { storeId, active: true } }),
      app.prisma.featured.findMany({ where: { storeId, active: true } }),
    ])

    // Promoção está expirada se a data de término já passou, ou se terminou hoje antes do horário atual
    const expiredPromotions = promotions.filter((p) => {
      if (!p.endDate) return false
      if (p.endDate < today) return true
      if (p.endDate === today && p.endTime && p.endTime < currentTime) return true
      return false
    })

    // Cupom está expirado se a data passou, ou se atingiu o limite de usos
    const expiredCoupons = coupons.filter((c) => {
      if (c.endDate && c.endDate < today) return true
      if (c.maxUses !== null && c.usedCount >= c.maxUses) return true
      return false
    })

    // Destaque está expirado se a data de término já passou, ou se terminou hoje antes do horário atual
    const expiredFeatured = featured.filter((f) => {
      if (!f.endDate) return false
      if (f.endDate < today) return true
      if (f.endDate === today && f.endTime && f.endTime < currentTime) return true
      return false
    })

    // Cria todas as notificações de expiração de uma vez — skipDuplicates evita re-criar as já existentes
    const toCreate = [
      ...expiredPromotions.map((p) => ({
        storeId,
        type: 'PROMOTION_ENDED',
        title: `Promoção "${p.name}" expirou`,
        body: `Encerrou em ${p.endDate}${p.endTime ? ` às ${p.endTime}` : ''}`,
        entityId: p.id,
      })),
      ...expiredCoupons.map((c) => ({
        storeId,
        type: 'COUPON_ENDED',
        title: `Cupom "${c.code}" encerrado`,
        body: (c.maxUses !== null && c.usedCount >= c.maxUses)
          ? `Limite de ${c.maxUses} uso${c.maxUses === 1 ? '' : 's'} atingido`
          : `Expirou em ${c.endDate}`,
        entityId: c.id,
      })),
      ...expiredFeatured.map((f) => ({
        storeId,
        type: 'FEATURED_ENDED',
        title: `Destaque "${f.title}" expirou`,
        body: `Encerrou em ${f.endDate}${f.endTime ? ` às ${f.endTime}` : ''}`,
        entityId: f.id,
      })),
    ]

    const result = await app.prisma.notification.createMany({ data: toCreate, skipDuplicates: true })

    return reply.send({ created: result.count })
  })
}
