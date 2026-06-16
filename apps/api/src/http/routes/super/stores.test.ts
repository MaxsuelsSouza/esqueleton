// Testes da gestão de lojas do super-admin — acesso restrito e ações de plataforma
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken } from '../../../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

const LOJA_LISTADA = {
  id: 'loja-1',
  slug: 'loja-um',
  name: 'Loja Um',
  status: 'ACTIVE',
  createdAt: new Date(),
  subscriptions: [{ status: 'ACTIVE', plan: { id: 'plan-1', name: 'Pro' } }],
  _count: { users: 2, products: 10 },
}

describe('GET /api/super/stores', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('admin comum recebe 403', async () => {
    app = await buildTestApp(createPrismaFake({}))
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'GET',
      url: '/api/super/stores',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(403)
  })

  it('super-admin recebe a lista com plano e contagens', async () => {
    app = await buildTestApp(
      createPrismaFake({
        store: {
          findMany: vi.fn(async () => [LOJA_LISTADA]),
          count: vi.fn(async () => 1),
        },
      })
    )
    const token = await createTestToken(app, undefined, { isSuperAdmin: true })

    const response = await app.inject({
      method: 'GET',
      url: '/api/super/stores',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.total).toBe(1)
    expect(body.data[0]).toMatchObject({
      id: 'loja-1',
      name: 'Loja Um',
      usersCount: 2,
      productsCount: 10,
      plan: { id: 'plan-1', name: 'Pro' },
      subscriptionStatus: 'ACTIVE',
    })
  })
})

describe('PATCH /api/super/stores/:id', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('suspende uma loja', async () => {
    const storeUpdate = vi.fn(async () => ({}))
    app = await buildTestApp(
      createPrismaFake({
        store: {
          findUnique: vi.fn(async () => ({ id: 'loja-1', status: 'ACTIVE' })),
          update: storeUpdate,
        },
      })
    )
    const token = await createTestToken(app, undefined, { isSuperAdmin: true })

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/super/stores/loja-1',
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'SUSPENDED' },
    })

    expect(response.statusCode).toBe(200)
    expect(storeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'loja-1' }, data: { status: 'SUSPENDED' } })
    )
  })

  it('troca o plano da loja cancelando a assinatura atual', async () => {
    const subscriptionUpdate = vi.fn(async () => ({}))
    const subscriptionCreate = vi.fn(async () => ({}))
    app = await buildTestApp(
      createPrismaFake({
        store: { findUnique: vi.fn(async () => ({ id: 'loja-1', status: 'ACTIVE' })) },
        plan: { findUnique: vi.fn(async () => ({ id: 'plan-novo', name: 'Novo' })) },
        subscription: {
          findFirst: vi.fn(async () => ({ id: 'sub-antiga', storeId: 'loja-1', mercadoPagoPreapprovalId: null })),
          update: subscriptionUpdate,
          create: subscriptionCreate,
        },
      })
    )
    const token = await createTestToken(app, undefined, { isSuperAdmin: true })

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/super/stores/loja-1',
      headers: { authorization: `Bearer ${token}` },
      payload: { planId: 'plan-novo' },
    })

    expect(response.statusCode).toBe(200)
    // A antiga é cancelada e a nova nasce ativa, sem passar pelo checkout
    expect(subscriptionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CANCELLED' } })
    )
    expect(subscriptionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { storeId: 'loja-1', planId: 'plan-novo', status: 'ACTIVE' },
      })
    )
  })

  it('plano inexistente responde 404', async () => {
    app = await buildTestApp(
      createPrismaFake({
        store: { findUnique: vi.fn(async () => ({ id: 'loja-1' })) },
        plan: { findUnique: vi.fn(async () => null) },
      })
    )
    const token = await createTestToken(app, undefined, { isSuperAdmin: true })

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/super/stores/loja-1',
      headers: { authorization: `Bearer ${token}` },
      payload: { planId: 'plan-fantasma' },
    })

    expect(response.statusCode).toBe(404)
  })
})

describe('DELETE /api/super/plans/:id (desativação)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('bloqueia a desativação enquanto houver lojas no plano', async () => {
    const planUpdate = vi.fn(async () => ({}))
    app = await buildTestApp(
      createPrismaFake({
        plan: { findUnique: vi.fn(async () => ({ id: 'plan-1', name: 'Pro' })), update: planUpdate },
        subscription: { findFirst: vi.fn(async () => null), count: vi.fn(async () => 3) },
      })
    )
    const token = await createTestToken(app, undefined, { isSuperAdmin: true })

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/super/plans/plan-1',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(400)
    expect(planUpdate).not.toHaveBeenCalled()
  })

  it('desativa (soft-delete) quando nenhuma loja usa o plano', async () => {
    const planUpdate = vi.fn(async () => ({}))
    app = await buildTestApp(
      createPrismaFake({
        plan: { findUnique: vi.fn(async () => ({ id: 'plan-1', name: 'Pro' })), update: planUpdate },
        subscription: { findFirst: vi.fn(async () => null), count: vi.fn(async () => 0) },
      })
    )
    const token = await createTestToken(app, undefined, { isSuperAdmin: true })

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/super/plans/plan-1',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(204)
    // Soft-delete: o plano é desativado, nunca apagado do banco
    expect(planUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { active: false } })
    )
  })
})
