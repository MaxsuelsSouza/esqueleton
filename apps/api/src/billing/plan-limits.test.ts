// Testes dos limites do plano — dentro do limite passa, no limite responde 403,
// e a partir de 80% de uso o lojista é avisado no painel
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken, LOJA_TESTE } from '../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

// Assinatura ativa com os limites informados
function assinaturaComLimites(limits: Record<string, number | null>) {
  return {
    findFirst: vi.fn(async () => ({
      id: 'sub1',
      storeId: LOJA_TESTE.id,
      status: 'ACTIVE',
      plan: { id: 'plan1', name: 'Plano Teste', limits },
    })),
  }
}

const PRODUTO_CRIADO = {
  id: 'p-novo',
  brand: null,
  name: 'Produto Novo',
  description: null,
  price: 10,
  imageUrl: null,
  storeId: LOJA_TESTE.id,
  categories: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('limite de produtos (POST /api/products)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('cria o produto quando está abaixo do limite', async () => {
    const productCreate = vi.fn(async () => PRODUTO_CRIADO)
    app = await buildTestApp(
      createPrismaFake({
        subscription: assinaturaComLimites({ maxProducts: 5 }),
        product: { count: vi.fn(async () => 1), create: productCreate },
        notification: { upsert: vi.fn(async () => ({})) },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Produto Novo', price: 10 },
    })

    expect(response.statusCode).toBe(201)
    expect(productCreate).toHaveBeenCalled()
  })

  it('responde 403 quando o limite foi atingido', async () => {
    const productCreate = vi.fn(async () => PRODUTO_CRIADO)
    app = await buildTestApp(
      createPrismaFake({
        subscription: assinaturaComLimites({ maxProducts: 2 }),
        product: { count: vi.fn(async () => 2), create: productCreate },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Produto Novo', price: 10 },
    })

    expect(response.statusCode).toBe(403)
    expect(response.json().message).toContain('Limite de produtos')
    expect(productCreate).not.toHaveBeenCalled()
  })

  it('limite não definido no plano significa ilimitado', async () => {
    const productCreate = vi.fn(async () => PRODUTO_CRIADO)
    app = await buildTestApp(
      createPrismaFake({
        subscription: assinaturaComLimites({}),
        product: { count: vi.fn(async () => 99999), create: productCreate },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Produto Novo', price: 10 },
    })

    expect(response.statusCode).toBe(201)
  })

  it('avisa o lojista quando o uso chega a 80% do limite', async () => {
    const notificationUpsert = vi.fn(async () => ({}))
    app = await buildTestApp(
      createPrismaFake({
        subscription: assinaturaComLimites({ maxProducts: 10 }),
        product: { count: vi.fn(async () => 8), create: vi.fn(async () => PRODUTO_CRIADO) },
        notification: { upsert: notificationUpsert },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Produto Novo', price: 10 },
    })

    // A criação passa (8 < 10), mas o aviso de 80% é registrado
    expect(response.statusCode).toBe(201)
    expect(notificationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ type: 'PLAN_LIMIT_APPROACHING' }),
      })
    )
  })
})

describe('limite de pedidos no mês (POST /api/lojas/:slug/orders)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('responde 403 quando a loja atingiu o teto de pedidos do mês', async () => {
    const orderCreate = vi.fn(async () => ({}))
    app = await buildTestApp(
      createPrismaFake({
        subscription: assinaturaComLimites({ maxOrdersPerMonth: 100 }),
        order: { count: vi.fn(async () => 100), create: orderCreate },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: {},
    })

    expect(response.statusCode).toBe(403)
    expect(response.json().message).toContain('Limite de pedidos neste mês')
    expect(orderCreate).not.toHaveBeenCalled()
  })
})

describe('limite de usuários (convite de equipe)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('responde 403 quando a equipe está no limite do plano', async () => {
    const userCreate = vi.fn(async () => ({}))
    app = await buildTestApp(
      createPrismaFake({
        subscription: assinaturaComLimites({ maxUsers: 2 }),
        user: { count: vi.fn(async () => 2), findUnique: vi.fn(async () => null), create: userCreate },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'novo@loja.com', password: 'senha-segura-123' },
    })

    expect(response.statusCode).toBe(403)
    expect(response.json().message).toContain('Limite de usuários')
    expect(userCreate).not.toHaveBeenCalled()
  })
})
