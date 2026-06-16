// Rotas de promoções — divididas em dois grupos:
//   - promotionPublicRoutes: catálogo público vê apenas promoções ativas, a loja vem do slug
//   - promotionAdminRoutes: gestão pelo painel (lista completa), a loja vem do token JWT
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { promotionSchema } from '../../schemas/promotion.schema'
import { idParamSchema } from '../../../shared/validation/schemas'

// ── Rotas públicas — a loja vem do slug na URL ─────────────────────
export const promotionPublicRoutes: FastifyPluginAsync = async (app) => {
  // Público vê apenas promoções ativas — as desativadas e agendadas são informação interna da loja
  app.get('/', async (request) => {
    return app.prisma.promotion.findMany({
      where: { storeId: request.store!.id, active: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    })
  })

  app.get('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const promotion = await app.prisma.promotion.findFirst({
      where: { id, storeId: request.store!.id, active: true },
    })
    if (!promotion) {
      return reply.status(404).send({ message: 'Promoção não encontrada' })
    }
    return promotion
  })
}

// ── Rotas do admin — a loja vem do token JWT ───────────────────────
export const promotionAdminRoutes: FastifyPluginAsync = async (app) => {
  // Todas as rotas deste grupo exigem login
  app.addHook('preHandler', app.authenticate)

  // Lista completa, incluindo promoções desativadas e agendadas
  app.get('/', async (request) => {
    return app.prisma.promotion.findMany({
      where: { storeId: request.user.storeId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    })
  })

  app.get('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const promotion = await app.prisma.promotion.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!promotion) {
      return reply.status(404).send({ message: 'Promoção não encontrada' })
    }
    return promotion
  })

  // Reordena as promoções — recebe uma lista de IDs na nova ordem e
  // atribui priority = posição do ID na lista (0, 1, 2, …)
  app.put('/reorder', async (request) => {
    const storeId = request.user.storeId
    const { ids } = z.object({ ids: z.array(z.string().cuid()).min(1) }).parse(request.body)
    // updateMany com id + storeId: IDs de outras lojas simplesmente não alteram nada
    await app.prisma.$transaction(
      ids.map((id, index) =>
        app.prisma.promotion.updateMany({ where: { id, storeId }, data: { priority: index } }),
      ),
    )
    return { message: 'Ordem atualizada' }
  })

  app.post('/', async (request, reply) => {
    const data = promotionSchema.parse(request.body)
    const promotion = await app.prisma.promotion.create({
      data: { ...data, storeId: request.user.storeId },
    })
    return reply.status(201).send(promotion)
  })

  app.put('/:id', async (request, reply) => {
    const storeId = request.user.storeId
    const { id } = idParamSchema.parse(request.params)
    const data = promotionSchema.partial().parse(request.body)
    const { count } = await app.prisma.promotion.updateMany({ where: { id, storeId }, data })
    if (count === 0) {
      return reply.status(404).send({ message: 'Promoção não encontrada' })
    }
    return app.prisma.promotion.findFirst({ where: { id, storeId } })
  })

  app.delete('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const { count } = await app.prisma.promotion.deleteMany({
      where: { id, storeId: request.user.storeId },
    })
    if (count === 0) {
      return reply.status(404).send({ message: 'Promoção não encontrada' })
    }
    return reply.status(204).send()
  })
}
