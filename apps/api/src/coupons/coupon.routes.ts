import type { FastifyPluginAsync } from 'fastify'
import { couponSchema } from './coupon.schema'
import { idParamSchema } from '../common/validation'

export const couponRoutes: FastifyPluginAsync = async (app) => {
  // ── Rota pública ────────────────────────────────────────────────

  // Busca um cupom pelo código digitado pelo cliente no checkout.
  // A validação acontece aqui no servidor e a resposta traz apenas os campos
  // necessários para aplicar o desconto — assim os códigos dos outros cupons,
  // limites de uso e datas nunca ficam expostos para quem navega no catálogo.
  // O limite de requisições impede que alguém descubra códigos por tentativa e erro.
  app.get(
    '/codigo/:code',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { code } = request.params as { code: string }

      // Aceita apenas o formato válido de código — qualquer outra coisa nem chega ao banco
      if (!/^[A-Za-z0-9_-]{1,50}$/.test(code)) {
        return reply.status(404).send({ message: 'Cupom não encontrado.' })
      }

      const coupon = await app.prisma.coupon.findUnique({
        where: { code: code.toUpperCase() },
      })

      if (!coupon) {
        return reply.status(404).send({ message: 'Cupom não encontrado.' })
      }

      const today = new Date().toISOString().slice(0, 10)
      if (!coupon.active || (coupon.startDate && today < coupon.startDate)) {
        return reply.status(404).send({ message: 'Este cupom não está disponível.' })
      }
      if (coupon.endDate && today > coupon.endDate) {
        return reply.status(404).send({ message: 'Este cupom está expirado.' })
      }
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        return reply.status(404).send({ message: 'Este cupom atingiu o limite de usos.' })
      }

      // Apenas os campos necessários para calcular o desconto no catálogo
      return {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountPercent: coupon.discountPercent,
        discountValue: coupon.discountValue,
        minimumOrderValue: coupon.minimumOrderValue,
        productIds: coupon.productIds,
        active: coupon.active,
      }
    }
  )

  // ── Rotas protegidas (requer JWT) ───────────────────────────────

  // Lista todos os cupons — apenas para o painel admin.
  // Não pode ser pública: exporia todos os códigos de desconto da loja.
  app.get('/', { preHandler: [app.authenticate] }, async () => {
    return app.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })
  })

  app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const coupon = await app.prisma.coupon.findUnique({ where: { id } })
    if (!coupon) {
      return reply.status(404).send({ message: 'Cupom não encontrado' })
    }
    return coupon
  })

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
      const { id } = idParamSchema.parse(request.params)
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
      const { id } = idParamSchema.parse(request.params)
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
      const { id } = idParamSchema.parse(request.params)
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
