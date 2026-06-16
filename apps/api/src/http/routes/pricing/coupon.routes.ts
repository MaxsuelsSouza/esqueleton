// Rotas de cupons — divididas em dois grupos:
//   - couponPublicRoutes: validação do código digitado no checkout, a loja vem do slug na URL
//   - couponAdminRoutes: gestão pelo painel, a loja vem do token JWT
import type { FastifyPluginAsync } from 'fastify'
import { couponSchema } from '../../schemas/coupon.schema'
import { idParamSchema } from '../../../shared/validation/schemas'
import { isCouponUsable } from '../../../domain/pricing/services/coupon.service'

// ── Rota pública — a loja vem do slug na URL ───────────────────────
export const couponPublicRoutes: FastifyPluginAsync = async (app) => {
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

      // O código é único dentro de cada loja — a busca usa a chave composta loja + código
      const coupon = await app.prisma.coupon.findUnique({
        where: { storeId_code: { storeId: request.store!.id, code: code.toUpperCase() } },
      })

      if (!coupon) {
        return reply.status(404).send({ message: 'Cupom não encontrado.' })
      }

      // Valida se o cupom pode ser usado (ativo, dentro das datas, dentro do limite de usos)
      const validacao = isCouponUsable(coupon)
      if (!validacao.valid) {
        return reply.status(404).send({ message: validacao.reason })
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
}

// ── Rotas do admin — a loja vem do token JWT ───────────────────────
export const couponAdminRoutes: FastifyPluginAsync = async (app) => {
  // Todas as rotas deste grupo exigem login.
  // A lista não pode ser pública: exporia todos os códigos de desconto da loja.
  app.addHook('preHandler', app.authenticate)

  app.get('/', async (request) => {
    return app.prisma.coupon.findMany({
      where: { storeId: request.user.storeId },
      orderBy: { createdAt: 'desc' },
    })
  })

  app.get('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const coupon = await app.prisma.coupon.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!coupon) {
      return reply.status(404).send({ message: 'Cupom não encontrado' })
    }
    return coupon
  })

  app.post('/', async (request, reply) => {
    const storeId = request.user.storeId
    const data = couponSchema.parse(request.body)

    // Verifica se já existe outro cupom com o mesmo código nesta loja
    const existing = await app.prisma.coupon.findUnique({
      where: { storeId_code: { storeId, code: data.code } },
    })
    if (existing) {
      return reply.status(409).send({ message: 'Já existe um cupom com este código' })
    }

    const coupon = await app.prisma.coupon.create({ data: { ...data, storeId } })
    return reply.status(201).send(coupon)
  })

  app.put('/:id', async (request, reply) => {
    const storeId = request.user.storeId
    const { id } = idParamSchema.parse(request.params)
    const data = couponSchema.partial().parse(request.body)

    // Se o código foi alterado, verifica conflito com outro cupom da mesma loja
    if (data.code) {
      const existing = await app.prisma.coupon.findUnique({
        where: { storeId_code: { storeId, code: data.code } },
      })
      if (existing && existing.id !== id) {
        return reply.status(409).send({ message: 'Já existe um cupom com este código' })
      }
    }

    const { count } = await app.prisma.coupon.updateMany({ where: { id, storeId }, data })
    if (count === 0) {
      return reply.status(404).send({ message: 'Cupom não encontrado' })
    }
    return app.prisma.coupon.findFirst({ where: { id, storeId } })
  })

  app.delete('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const { count } = await app.prisma.coupon.deleteMany({
      where: { id, storeId: request.user.storeId },
    })
    if (count === 0) {
      return reply.status(404).send({ message: 'Cupom não encontrado' })
    }
    return reply.status(204).send()
  })

  // Incrementa o contador de usos — chamado quando um cupom é aplicado no checkout
  app.post('/:id/usar', async (request, reply) => {
    const storeId = request.user.storeId
    const { id } = idParamSchema.parse(request.params)
    const { count } = await app.prisma.coupon.updateMany({
      where: { id, storeId },
      data: { usedCount: { increment: 1 } },
    })
    if (count === 0) {
      return reply.status(404).send({ message: 'Cupom não encontrado' })
    }
    return app.prisma.coupon.findFirst({ where: { id, storeId } })
  })
}
