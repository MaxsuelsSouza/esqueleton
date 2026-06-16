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

  // POST /api/super/plans — cria um plano; planos pagos ganham a recorrência no MercadoPago
  app.post('/', async (request, reply) => {
    const data = planSchema.parse(request.body)

    const existing = await app.prisma.plan.findUnique({ where: { slug: data.slug } })
    if (existing) {
      return reply.status(409).send({ message: 'Já existe um plano com este identificador (slug)' })
    }

    // Plano pago: cria o plano de recorrência no MercadoPago antes de salvar
    let mercadoPagoPreapprovalPlanId: string | null = null
    if (data.priceInCents > 0 && app.mercadopago.isConfigured) {
      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
      const mpPlan = await app.mercadopago.createPlan({
        name: data.name,
        amountInCents: data.priceInCents,
        billingPeriod: data.billingPeriod,
        backUrl: `${frontendUrl}/admin/plano`,
      })
      if (!mpPlan) {
        return reply.status(502).send({ message: 'Não foi possível criar o plano no MercadoPago. Tente novamente.' })
      }
      mercadoPagoPreapprovalPlanId = mpPlan.id
    }

    const plan = await app.prisma.plan.create({
      data: { ...data, mercadoPagoPreapprovalPlanId },
    })

    return reply.status(201).send(plan)
  })

  // PUT /api/super/plans/:id — atualiza um plano.
  // Atenção: o valor da recorrência no MercadoPago não é alterado automaticamente —
  // assinaturas existentes continuam no preço antigo; as novas usam o plano novo
  // somente se um novo plano de recorrência for criado (preço alterado → recria).
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

    // Virou pago (ou mudou de preço/período) e ainda não tem recorrência? Cria no MercadoPago.
    let mercadoPagoPreapprovalPlanId = plan.mercadoPagoPreapprovalPlanId
    const precoMudou = data.priceInCents !== plan.priceInCents || data.billingPeriod !== plan.billingPeriod
    if (data.priceInCents > 0 && app.mercadopago.isConfigured && (precoMudou || !mercadoPagoPreapprovalPlanId)) {
      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
      const mpPlan = await app.mercadopago.createPlan({
        name: data.name,
        amountInCents: data.priceInCents,
        billingPeriod: data.billingPeriod,
        backUrl: `${frontendUrl}/admin/plano`,
      })
      if (!mpPlan) {
        return reply.status(502).send({ message: 'Não foi possível atualizar o plano no MercadoPago. Tente novamente.' })
      }
      mercadoPagoPreapprovalPlanId = mpPlan.id
    }

    const updated = await app.prisma.plan.update({
      where: { id },
      data: { ...data, mercadoPagoPreapprovalPlanId },
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
