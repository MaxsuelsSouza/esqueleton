// CRUD de planos da plataforma — exclusivo do super-admin.
// O modelo Plan é global (não pertence a uma loja); as contagens de assinaturas
// atravessam lojas, por isso usam prismaRaw.
import type { FastifyPluginAsync } from 'fastify'
import { requireSuperAdmin } from '../../../domain/identity/guards/super-admin.guard'
import { idParamSchema } from '../../../shared/validation/schemas'
import { planSchema } from '../../schemas/super.schema'

export const superPlansRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate)
  app.addHook('preHandler', requireSuperAdmin)

  // GET /api/super/plans — todos os planos, inclusive inativos
  app.get('/', async () => {
    const plans = await app.prisma.plan.findMany({
      orderBy: { sortOrder: 'asc' },
    })

    // Quantas lojas estão ativas em cada plano — ajuda a decidir se pode desativar
    const activeCounts = await app.prismaRaw.subscription.groupBy({
      by: ['planId'],
      where: { status: 'ACTIVE' },
      _count: { planId: true },
    })
    const countByPlan = new Map(activeCounts.map((c) => [c.planId, c._count.planId]))

    return plans.map((plan) => ({
      ...plan,
      activeSubscriptions: countByPlan.get(plan.id) ?? 0,
    }))
  })

  // POST /api/super/plans — cria um plano; planos pagos ganham Product + Price no Stripe
  app.post('/', async (request, reply) => {
    const data = planSchema.parse(request.body)

    const existing = await app.prisma.plan.findUnique({ where: { slug: data.slug } })
    if (existing) {
      return reply.status(409).send({ message: 'Já existe um plano com este identificador (slug)' })
    }

    // Plano pago: cria o Product + Price no Stripe antes de salvar
    let stripeProductId: string | null = null
    let stripePriceId: string | null = null
    if (data.priceInCents > 0 && app.stripe.isConfigured) {
      const stripePlan = await app.stripe.createProductWithPrice({
        name: data.name,
        amountInCents: data.priceInCents,
        billingPeriod: data.billingPeriod,
      })
      if (!stripePlan) {
        return reply.status(502).send({ message: 'Não foi possível criar o plano no Stripe. Tente novamente.' })
      }
      stripeProductId = stripePlan.productId
      stripePriceId = stripePlan.priceId
    }

    const plan = await app.prisma.plan.create({
      data: { ...data, stripeProductId, stripePriceId },
    })

    return reply.status(201).send(plan)
  })

  // PUT /api/super/plans/:id — atualiza um plano.
  // Atenção: o Price do Stripe é imutável — assinaturas existentes continuam no
  // preço antigo; mudança de preço/período cria um novo Price no mesmo Product,
  // que passa a valer para as novas assinaturas.
  app.put('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const data = planSchema.parse(request.body)

    const plan = await app.prisma.plan.findUnique({ where: { id } })
    if (!plan) {
      return reply.status(404).send({ message: 'Plano não encontrado' })
    }

    // O slug é único — confere se o novo valor não pertence a outro plano
    const slugOwner = await app.prisma.plan.findUnique({ where: { slug: data.slug } })
    if (slugOwner && slugOwner.id !== id) {
      return reply.status(409).send({ message: 'Já existe um plano com este identificador (slug)' })
    }

    // Virou pago (ou mudou de preço/período) e ainda não tem Price? Cria no Stripe.
    let stripeProductId = plan.stripeProductId
    let stripePriceId = plan.stripePriceId
    const precoMudou = data.priceInCents !== plan.priceInCents || data.billingPeriod !== plan.billingPeriod
    if (data.priceInCents > 0 && app.stripe.isConfigured && (precoMudou || !stripePriceId)) {
      const stripePlan = await app.stripe.createProductWithPrice({
        name: data.name,
        amountInCents: data.priceInCents,
        billingPeriod: data.billingPeriod,
      })
      if (!stripePlan) {
        return reply.status(502).send({ message: 'Não foi possível atualizar o plano no Stripe. Tente novamente.' })
      }
      stripeProductId = stripePlan.productId
      stripePriceId = stripePlan.priceId
    }

    const updated = await app.prisma.plan.update({
      where: { id },
      data: { ...data, stripeProductId, stripePriceId },
    })

    return updated
  })

  // DELETE /api/super/plans/:id — desativa o plano (soft-delete).
  // Bloqueado enquanto houver lojas com assinatura ativa ou pendente nele.
  app.delete('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)

    const plan = await app.prisma.plan.findUnique({ where: { id } })
    if (!plan) {
      return reply.status(404).send({ message: 'Plano não encontrado' })
    }

    const subscribedStores = await app.prismaRaw.subscription.count({
      where: { planId: id, status: { in: ['ACTIVE', 'PENDING', 'PAUSED'] } },
    })
    if (subscribedStores > 0) {
      return reply.status(400).send({
        message: `Não é possível desativar: ${subscribedStores} loja(s) ainda usam este plano. Mova-as para outro plano primeiro.`,
      })
    }

    await app.prisma.plan.update({ where: { id }, data: { active: false } })
    return reply.status(204).send()
  })
}
