// Rotas de notificações — lista, marca como lida e verifica expirações
import type { FastifyInstance } from 'fastify'

export async function notificationRoutes(app: FastifyInstance) {

  // GET /api/notifications — lista todas as notificações, mais recentes primeiro
  app.get('/', { preHandler: [app.authenticate] }, async (_request, reply) => {
    const [notifications, unreadCount] = await Promise.all([
      app.prisma.notification.findMany({ orderBy: { createdAt: 'desc' } }),
      app.prisma.notification.count({ where: { status: 'PENDING' } }),
    ])
    return reply.send({ notifications, unreadCount })
  })

  // PATCH /api/notifications/:id/read — marca uma notificação como lida
  app.patch('/:id/read', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await app.prisma.notification.update({ where: { id }, data: { status: 'READ' } })
      return reply.send({ message: 'Notificação marcada como lida.' })
    } catch {
      return reply.status(404).send({ message: 'Notificação não encontrada.' })
    }
  })

  // PATCH /api/notifications/read-all — marca todas as notificações como lidas
  app.patch('/read-all', { preHandler: [app.authenticate] }, async (_request, reply) => {
    await app.prisma.notification.updateMany({ where: { status: 'PENDING' }, data: { status: 'READ' } })
    return reply.send({ message: 'Todas as notificações marcadas como lidas.' })
  })

  // DELETE /api/notifications/:id — remove uma notificação
  app.delete('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await app.prisma.notification.delete({ where: { id } })
      return reply.status(204).send()
    } catch {
      return reply.status(404).send({ message: 'Notificação não encontrada.' })
    }
  })

  // POST /api/notifications/check-expiry — verifica promoções, cupons e destaques expirados
  // Chamado pelo frontend quando o admin abre a página de notificações
  app.post('/check-expiry', { preHandler: [app.authenticate] }, async (_request, reply) => {
    const now = new Date()
    // Data e hora no formato UTC — mesmo formato armazenado no banco ("YYYY-MM-DD" e "HH:MM")
    const today = now.toISOString().slice(0, 10)
    const currentTime = now.toISOString().slice(11, 16)

    const [promotions, coupons, featured] = await Promise.all([
      app.prisma.promotion.findMany({ where: { active: true } }),
      app.prisma.coupon.findMany({ where: { active: true } }),
      app.prisma.featured.findMany({ where: { active: true } }),
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
        type: 'PROMOTION_ENDED',
        title: `Promoção "${p.name}" expirou`,
        body: `Encerrou em ${p.endDate}${p.endTime ? ` às ${p.endTime}` : ''}`,
        entityId: p.id,
      })),
      ...expiredCoupons.map((c) => ({
        type: 'COUPON_ENDED',
        title: `Cupom "${c.code}" encerrado`,
        body: (c.maxUses !== null && c.usedCount >= c.maxUses)
          ? `Limite de ${c.maxUses} uso${c.maxUses === 1 ? '' : 's'} atingido`
          : `Expirou em ${c.endDate}`,
        entityId: c.id,
      })),
      ...expiredFeatured.map((f) => ({
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
