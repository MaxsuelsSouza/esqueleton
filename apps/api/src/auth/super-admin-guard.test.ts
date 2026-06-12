// Testes do guard de super-admin — só quem tem a flag acessa /api/super
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken } from '../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

describe('requireSuperAdmin (via /api/super/metrics)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  function bancoComMetricas() {
    return createPrismaFake({
      store: {
        count: vi.fn(async (args: unknown) => {
          const status = (args as { where?: { status?: string } })?.where?.status
          if (status === 'ACTIVE') return 2
          if (status === 'SUSPENDED') return 1
          return 3
        }),
      },
      user: { count: vi.fn(async () => 5) },
      subscription: {
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => [
          // Duas lojas no plano mensal de R$ 49,90 e uma no anual de R$ 478,80
          { plan: { id: 'p1', name: 'Pro', priceInCents: 4990, billingPeriod: 'MONTHLY' } },
          { plan: { id: 'p1', name: 'Pro', priceInCents: 4990, billingPeriod: 'MONTHLY' } },
          { plan: { id: 'p2', name: 'Anual', priceInCents: 47880, billingPeriod: 'YEARLY' } },
        ]),
      },
    })
  }

  it('sem token responde 401', async () => {
    app = await buildTestApp(bancoComMetricas())

    const response = await app.inject({ method: 'GET', url: '/api/super/metrics' })

    expect(response.statusCode).toBe(401)
  })

  it('admin comum (sem a flag) recebe 403', async () => {
    app = await buildTestApp(bancoComMetricas())
    const token = await createTestToken(app) // isSuperAdmin: false por padrão

    const response = await app.inject({
      method: 'GET',
      url: '/api/super/metrics',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(403)
  })

  it('super-admin acessa e recebe as métricas com MRR correto', async () => {
    app = await buildTestApp(bancoComMetricas())
    const token = await createTestToken(app, undefined, { isSuperAdmin: true })

    const response = await app.inject({
      method: 'GET',
      url: '/api/super/metrics',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.totalStores).toBe(3)
    expect(body.activeStores).toBe(2)
    expect(body.suspendedStores).toBe(1)
    expect(body.totalUsers).toBe(5)
    // MRR: 2 × 4990 + (47880 / 12) = 9980 + 3990 = 13970 centavos
    expect(body.mrrInCents).toBe(13970)
    // Plano com mais assinaturas vem primeiro
    expect(body.subscriptionsByPlan[0]).toEqual({ planId: 'p1', planName: 'Pro', count: 2 })
  })
})
