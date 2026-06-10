import type { FastifyPluginAsync } from 'fastify'
import { promotionSchema } from './promotion.schema'

export const promotionRoutes: FastifyPluginAsync = async (app) => {
  // ── Rotas públicas ──────────────────────────────────────────────

  app.get('/', async () => {
    return app.prisma.promotion.findMany({ orderBy: { createdAt: 'desc' } })
  })

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const promotion = await app.prisma.promotion.findUnique({ where: { id } })
    if (!promotion) {
      return reply.status(404).send({ message: 'Promoção não encontrada' })
    }
    return promotion
  })

  // ── Rotas protegidas (requer JWT) ───────────────────────────────

  app.post(
    '/',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const data = promotionSchema.parse(request.body)
      const promotion = await app.prisma.promotion.create({ data })
      return reply.status(201).send(promotion)
    }
  )

  app.put(
    '/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = promotionSchema.partial().parse(request.body)
      try {
        const promotion = await app.prisma.promotion.update({ where: { id }, data })
        return promotion
      } catch {
        return reply.status(404).send({ message: 'Promoção não encontrada' })
      }
    }
  )

  app.delete(
    '/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      try {
        await app.prisma.promotion.delete({ where: { id } })
        return reply.status(204).send()
      } catch {
        return reply.status(404).send({ message: 'Promoção não encontrada' })
      }
    }
  )
}
