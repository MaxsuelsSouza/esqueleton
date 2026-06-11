import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { promotionSchema } from './promotion.schema'
import { idParamSchema } from '../common/validation'

export const promotionRoutes: FastifyPluginAsync = async (app) => {
  // ── Rotas públicas ──────────────────────────────────────────────

  // Público vê apenas promoções ativas — as desativadas e agendadas são
  // informação interna da loja. Admin autenticado recebe a lista completa.
  app.get('/', async (request) => {
    const isAdmin = await request.jwtVerify().then(() => true).catch(() => false)
    return app.prisma.promotion.findMany({
      where: isAdmin ? undefined : { active: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    })
  })

  app.get('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const isAdmin = await request.jwtVerify().then(() => true).catch(() => false)
    const promotion = await app.prisma.promotion.findUnique({ where: { id } })
    // Promoção inativa só é visível para o admin
    if (!promotion || (!isAdmin && !promotion.active)) {
      return reply.status(404).send({ message: 'Promoção não encontrada' })
    }
    return promotion
  })

  // ── Rotas protegidas (requer JWT) ───────────────────────────────

  // Reordena as promoções — recebe uma lista de IDs na nova ordem e
  // atribui priority = posição do ID na lista (0, 1, 2, …)
  app.put(
    '/reorder',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { ids } = z.object({ ids: z.array(z.string().cuid()).min(1) }).parse(request.body)
      await app.prisma.$transaction(
        ids.map((id, index) =>
          app.prisma.promotion.update({ where: { id }, data: { priority: index } }),
        ),
      )
      return { message: 'Ordem atualizada' }
    }
  )

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
      const { id } = idParamSchema.parse(request.params)
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
      const { id } = idParamSchema.parse(request.params)
      try {
        await app.prisma.promotion.delete({ where: { id } })
        return reply.status(204).send()
      } catch {
        return reply.status(404).send({ message: 'Promoção não encontrada' })
      }
    }
  )
}
