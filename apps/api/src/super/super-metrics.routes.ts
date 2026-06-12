// Métricas da plataforma — exclusivo do super-admin.
// Tudo cross-store, por isso prismaRaw.
import type { FastifyPluginAsync } from 'fastify'
import { requireSuperAdmin } from '../auth/super-admin-guard'

export const superMetricsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate)
  app.addHook('preHandler', requireSuperAdmin)

  // GET /api/super/metrics — totais da plataforma, MRR e assinaturas por plano
  app.get('/', async () => {
    const [totalStores, activeStores, suspendedStores, totalUsers, activeSubscriptions] =
      await Promise.all([
        app.prismaRaw.store.count(),
        app.prismaRaw.store.count({ where: { status: 'ACTIVE' } }),
        app.prismaRaw.store.count({ where: { status: 'SUSPENDED' } }),
        app.prismaRaw.user.count(),
        app.prismaRaw.subscription.findMany({
          where: { status: 'ACTIVE' },
          include: { plan: { select: { id: true, name: true, priceInCents: true, billingPeriod: true } } },
        }),
      ])

    // MRR (receita recorrente mensal) em centavos — planos anuais entram divididos por 12
    let mrrInCents = 0
    const porPlano = new Map<string, { planId: string; planName: string; count: number }>()

    for (const sub of activeSubscriptions) {
      const mensal =
        sub.plan.billingPeriod === 'YEARLY'
          ? Math.round(sub.plan.priceInCents / 12)
          : sub.plan.priceInCents
      mrrInCents += mensal

      const atual = porPlano.get(sub.plan.id)
      if (atual) {
        atual.count += 1
      } else {
        porPlano.set(sub.plan.id, { planId: sub.plan.id, planName: sub.plan.name, count: 1 })
      }
    }

    return {
      totalStores,
      activeStores,
      suspendedStores,
      totalUsers,
      mrrInCents,
      subscriptionsByPlan: [...porPlano.values()].sort((a, b) => b.count - a.count),
    }
  })
}
