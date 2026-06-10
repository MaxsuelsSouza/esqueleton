import type { FastifyPluginAsync } from 'fastify'
import { couponSchema } from './coupon.schema'

export const couponRoutes: FastifyPluginAsync = async (app) => {
  // ── Rotas públicas ──────────────────────────────────────────────

  // Lista todos os cupons — admin recebe todos, cliente pode buscar pelo código
  app.get('/', async () => {
    return app.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })
  })

  // Busca um cupom pelo código — usado pelo catálogo para validar no frontend
  app.get('/codigo/:code', async (request, reply) => {
    const { code } = request.params as { code: string }
    const coupon = await app.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    })
    if (!coupon) {
      return reply.status(404).send({ message: 'Cupom não encontrado' })
    }
    return coupon
  })

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const coupon = await app.prisma.coupon.findUnique({ where: { id } })
    if (!coupon) {
      return reply.status(404).send({ message: 'Cupom não encontrado' })
    }
    return coupon
  })

  // ── Rotas protegidas (requer JWT) ───────────────────────────────

  app.post(
    '/',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const data = couponSchema.parse(request.body)

      // Verifica se já existe outro cupom com o mesmo código
      const existing = await app.prisma.coupon.findUnique({ where: { code: data.code } })
      if (existing) {
        return reply.status(409).send({ message: 'Já existe um cupom com este código' })
      }

      const coupon = await app.prisma.coupon.create({ data })
      return reply.status(201).send(coupon)
    }
  )

  app.put(
    '/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = couponSchema.partial().parse(request.body)

      // Se o código foi alterado, verifica conflito com outro cupom
      if (data.code) {
        const existing = await app.prisma.coupon.findUnique({ where: { code: data.code } })
        if (existing && existing.id !== id) {
          return reply.status(409).send({ message: 'Já existe um cupom com este código' })
        }
      }

      try {
        const coupon = await app.prisma.coupon.update({ where: { id }, data })
        return coupon
      } catch {
        return reply.status(404).send({ message: 'Cupom não encontrado' })
      }
    }
  )

  app.delete(
    '/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      try {
        await app.prisma.coupon.delete({ where: { id } })
        return reply.status(204).send()
      } catch {
        return reply.status(404).send({ message: 'Cupom não encontrado' })
      }
    }
  )

  // Incrementa o contador de usos — chamado quando um cupom é aplicado no checkout
  app.post(
    '/:id/usar',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      try {
        const coupon = await app.prisma.coupon.update({
          where: { id },
          data: { usedCount: { increment: 1 } },
        })
        return coupon
      } catch {
        return reply.status(404).send({ message: 'Cupom não encontrado' })
      }
    }
  )
}
