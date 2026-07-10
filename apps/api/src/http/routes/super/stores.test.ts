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

describe('POST /api/super/stores (venda presencial)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  type PlanoDeTeste = {
    id: string
    name: string
    active: boolean
    priceInCents: number
    mercadoPagoPreapprovalPlanId: string | null
    salesModality?: string
    setupFeeInCents?: number
  }
  const PLANO_PAGO: PlanoDeTeste = { id: 'plan-pago', name: 'Pro', active: true, priceInCents: 4990, mercadoPagoPreapprovalPlanId: 'mp-plan-1' }
  const PLANO_GRATUITO: PlanoDeTeste = { id: 'plan-free', name: 'Gratuito', active: true, priceInCents: 0, mercadoPagoPreapprovalPlanId: null }
  const PLANO_PRESENCIAL: PlanoDeTeste = {
    id: 'plan-presencial',
    name: 'Presencial',
    active: true,
    priceInCents: 9700,
    mercadoPagoPreapprovalPlanId: 'mp-plan-presencial',
    salesModality: 'PRESENCIAL',
    setupFeeInCents: 37800,
  }

  const PAYLOAD_LOJA_NOVA = {
    storeName: 'Loja Nova',
    storeSlug: 'loja-nova',
    whatsapp: '(81) 99999-8888',
    email: 'dono@lojanova.com',
    password: 'senha-forte-123',
    planId: 'plan-pago',
  }

  // Banco falso com tudo que a criação de loja usa — cada teste sobrescreve o que precisar
  function fakeParaCriacao(plano: typeof PLANO_PAGO, extras: Record<string, Record<string, (...args: unknown[]) => unknown>> = {}) {
    return createPrismaFake({
      plan: { findUnique: vi.fn(async () => plano) },
      store: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: 'loja-nova-id', slug: 'loja-nova', name: 'Loja Nova' })),
      },
      storeProfile: { create: vi.fn(async () => ({})) },
      user: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async (args: unknown) => ({
          id: 'dono-id',
          email: 'dono@lojanova.com',
          role: 'OWNER',
          storeId: 'loja-nova-id',
          createdAt: new Date(),
          ...(args as { data: Record<string, unknown> }).data,
        })),
      },
      subscription: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async (args: unknown) => ({ id: 'sub-nova', ...(args as { data: Record<string, unknown> }).data })),
      },
      emailVerificationToken: { create: vi.fn(async () => ({})) },
      ...extras,
    })
  }

  it('admin comum recebe 403', async () => {
    app = await buildTestApp(createPrismaFake({}))
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/super/stores',
      headers: { authorization: `Bearer ${token}` },
      payload: PAYLOAD_LOJA_NOVA,
    })

    expect(response.statusCode).toBe(403)
  })

  it('cria loja com plano pago — assinatura nasce PENDING e dono com senha temporária', async () => {
    const prismaFake = fakeParaCriacao(PLANO_PAGO)
    app = await buildTestApp(prismaFake)
    const token = await createTestToken(app, undefined, { isSuperAdmin: true })

    const response = await app.inject({
      method: 'POST',
      url: '/api/super/stores',
      headers: { authorization: `Bearer ${token}` },
      payload: PAYLOAD_LOJA_NOVA,
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.store).toMatchObject({ slug: 'loja-nova' })
    // Sem MercadoPago configurado nos testes o link vem nulo, mas a assinatura fica aguardando pagamento
    expect(body.subscription.status).toBe('PENDING')

    // O dono deve trocar a senha temporária no primeiro acesso e o aceite
    // dos termos fica pendente (quem cadastrou foi o vendedor)
    const userCreate = (prismaFake as unknown as { user: { create: ReturnType<typeof vi.fn> } }).user.create
    const dadosDoUsuario = userCreate.mock.calls[0][0].data
    expect(dadosDoUsuario.mustChangePassword).toBe(true)
    expect(dadosDoUsuario.acceptedTermsAt).toBeUndefined()
  })

  it('cria loja com plano gratuito — assinatura nasce ACTIVE, sem link', async () => {
    app = await buildTestApp(fakeParaCriacao(PLANO_GRATUITO))
    const token = await createTestToken(app, undefined, { isSuperAdmin: true })

    const response = await app.inject({
      method: 'POST',
      url: '/api/super/stores',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...PAYLOAD_LOJA_NOVA, planId: 'plan-free' },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.subscription.status).toBe('ACTIVE')
    expect(body.paymentLink).toBeNull()
  })

  it('email já cadastrado responde 409', async () => {
    app = await buildTestApp(
      fakeParaCriacao(PLANO_PAGO, {
        user: { findUnique: vi.fn(async () => ({ id: 'ja-existe' })) },
      })
    )
    const token = await createTestToken(app, undefined, { isSuperAdmin: true })

    const response = await app.inject({
      method: 'POST',
      url: '/api/super/stores',
      headers: { authorization: `Bearer ${token}` },
      payload: PAYLOAD_LOJA_NOVA,
    })

    expect(response.statusCode).toBe(409)
  })

  it('plano inexistente responde 404', async () => {
    app = await buildTestApp(
      fakeParaCriacao(PLANO_PAGO, {
        plan: { findUnique: vi.fn(async () => null) },
      })
    )
    const token = await createTestToken(app, undefined, { isSuperAdmin: true })

    const response = await app.inject({
      method: 'POST',
      url: '/api/super/stores',
      headers: { authorization: `Bearer ${token}` },
      payload: PAYLOAD_LOJA_NOVA,
    })

    expect(response.statusCode).toBe(404)
  })

  it('cria loja com plano PRESENCIAL — assinatura nasce PENDING_SETUP, sem link, aguardando confirmação da implantação', async () => {
    const prismaFake = fakeParaCriacao(PLANO_PRESENCIAL)
    app = await buildTestApp(prismaFake)
    const token = await createTestToken(app, undefined, { isSuperAdmin: true })

    const response = await app.inject({
      method: 'POST',
      url: '/api/super/stores',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...PAYLOAD_LOJA_NOVA, planId: 'plan-presencial' },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.subscription.status).toBe('PENDING_SETUP')
    expect(body.paymentLink).toBeNull()

    const subscriptionCreate = (prismaFake as unknown as { subscription: { create: ReturnType<typeof vi.fn> } }).subscription.create
    expect(subscriptionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { storeId: 'loja-nova-id', planId: 'plan-presencial', status: 'PENDING_SETUP' },
      })
    )
  })
})

describe('POST /api/super/stores/:id/payment-link', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  const PLANO_PAGO = { id: 'plan-pago', name: 'Pro', active: true, priceInCents: 4990, mercadoPagoPreapprovalPlanId: 'mp-plan-1' }

  it('gera assinatura PENDING para loja sem assinatura ativa', async () => {
    const subscriptionCreate = vi.fn(async (args: unknown) => ({ id: 'sub-link', ...(args as { data: Record<string, unknown> }).data }))
    app = await buildTestApp(
      createPrismaFake({
        store: { findUnique: vi.fn(async () => ({ id: 'loja-1', name: 'Loja Um' })) },
        plan: { findUnique: vi.fn(async () => PLANO_PAGO) },
        user: { findFirst: vi.fn(async () => ({ id: 'dono-1', email: 'dono@loja.com' })) },
        subscription: {
          findFirst: vi.fn(async () => null),
          findMany: vi.fn(async () => []),
          updateMany: vi.fn(async () => ({ count: 0 })),
          create: subscriptionCreate,
        },
      })
    )
    const token = await createTestToken(app, undefined, { isSuperAdmin: true })

    const response = await app.inject({
      method: 'POST',
      url: '/api/super/stores/loja-1/payment-link',
      headers: { authorization: `Bearer ${token}` },
      payload: { planId: 'plan-pago' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().subscription.status).toBe('PENDING')
    expect(subscriptionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { storeId: 'loja-1', planId: 'plan-pago', status: 'PENDING' },
      })
    )
  })

  it('loja com assinatura ativa responde 400', async () => {
    app = await buildTestApp(
      createPrismaFake({
        store: { findUnique: vi.fn(async () => ({ id: 'loja-1', name: 'Loja Um' })) },
        plan: { findUnique: vi.fn(async () => PLANO_PAGO) },
        subscription: { findFirst: vi.fn(async () => ({ id: 'sub-ativa', status: 'ACTIVE' })) },
      })
    )
    const token = await createTestToken(app, undefined, { isSuperAdmin: true })

    const response = await app.inject({
      method: 'POST',
      url: '/api/super/stores/loja-1/payment-link',
      headers: { authorization: `Bearer ${token}` },
      payload: { planId: 'plan-pago' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('plano gratuito responde 400 — não precisa de link', async () => {
    app = await buildTestApp(
      createPrismaFake({
        store: { findUnique: vi.fn(async () => ({ id: 'loja-1', name: 'Loja Um' })) },
        plan: { findUnique: vi.fn(async () => ({ ...PLANO_PAGO, priceInCents: 0 })) },
      })
    )
    const token = await createTestToken(app, undefined, { isSuperAdmin: true })

    const response = await app.inject({
      method: 'POST',
      url: '/api/super/stores/loja-1/payment-link',
      headers: { authorization: `Bearer ${token}` },
      payload: { planId: 'plan-pago' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('plano PRESENCIAL responde 400 — não usa link de pagamento', async () => {
    app = await buildTestApp(
      createPrismaFake({
        store: { findUnique: vi.fn(async () => ({ id: 'loja-1', name: 'Loja Um' })) },
        plan: {
          findUnique: vi.fn(async () => ({ ...PLANO_PAGO, salesModality: 'PRESENCIAL', setupFeeInCents: 37800 })),
        },
      })
    )
    const token = await createTestToken(app, undefined, { isSuperAdmin: true })

    const response = await app.inject({
      method: 'POST',
      url: '/api/super/stores/loja-1/payment-link',
      headers: { authorization: `Bearer ${token}` },
      payload: { planId: 'plan-pago' },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('POST /api/super/stores/:id/confirm-setup-fee', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  const PLANO_PRESENCIAL = { id: 'plan-presencial', priceInCents: 9700, mercadoPagoPreapprovalPlanId: null }

  it('confirma a implantação e ativa a loja imediatamente', async () => {
    const subscriptionUpdateMany = vi.fn(async () => ({ count: 1 }))
    app = await buildTestApp(
      createPrismaFake({
        store: { findUnique: vi.fn(async () => ({ id: 'loja-1', name: 'Loja Um' })) },
        subscription: {
          findFirst: vi.fn(async () => ({ id: 'sub-1', storeId: 'loja-1', status: 'PENDING_SETUP', plan: PLANO_PRESENCIAL })),
          updateMany: subscriptionUpdateMany,
        },
      })
    )
    const token = await createTestToken(app, undefined, { isSuperAdmin: true })

    const response = await app.inject({
      method: 'POST',
      url: '/api/super/stores/loja-1/confirm-setup-fee',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().subscription.status).toBe('ACTIVE')
    expect(subscriptionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-1', storeId: 'loja-1' },
        data: expect.objectContaining({ status: 'ACTIVE' }),
      })
    )
  })

  it('sem implantação pendente responde 400', async () => {
    app = await buildTestApp(
      createPrismaFake({
        store: { findUnique: vi.fn(async () => ({ id: 'loja-1', name: 'Loja Um' })) },
        subscription: { findFirst: vi.fn(async () => null) },
      })
    )
    const token = await createTestToken(app, undefined, { isSuperAdmin: true })

    const response = await app.inject({
      method: 'POST',
      url: '/api/super/stores/loja-1/confirm-setup-fee',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(400)
  })

  it('loja inexistente responde 404', async () => {
    app = await buildTestApp(
      createPrismaFake({
        store: { findUnique: vi.fn(async () => null) },
      })
    )
    const token = await createTestToken(app, undefined, { isSuperAdmin: true })

    const response = await app.inject({
      method: 'POST',
      url: '/api/super/stores/loja-1/confirm-setup-fee',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(404)
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
