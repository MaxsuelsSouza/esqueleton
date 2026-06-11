// Testes das rotas de pedidos — criação pública validada e gestão protegida
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken } from '../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

const pedidoValido = {
  orderNumber: '123456',
  customerName: 'Maria',
  customerPhone: '(81) 99999-9999',
  items: [
    { productId: 'p1', productName: 'Perfume Teste', quantity: 1, unitPrice: 100, lineTotal: 100 },
  ],
  subtotal: 100,
  discount: 0,
  total: 100,
}

const pedidoSalvo = {
  id: 'o1',
  ...pedidoValido,
  couponCode: null,
  status: 'PENDING',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('POST /api/orders (criação pública)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('cria um pedido com dados válidos', async () => {
    app = await buildTestApp(
      createPrismaFake({
        order: { create: vi.fn(async () => pedidoSalvo) },
        notification: { create: vi.fn(async () => ({})) },
      })
    )

    const response = await app.inject({ method: 'POST', url: '/api/orders', payload: pedidoValido })

    expect(response.statusCode).toBe(201)
  })

  it('rejeita número de pedido com caracteres inválidos', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: { ...pedidoValido, orderNumber: '123456; DROP TABLE' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('rejeita telefone com texto arbitrário', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: { ...pedidoValido, customerPhone: '<script>alert(1)</script>' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('rejeita pedido sem itens', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: { ...pedidoValido, items: [] },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('rotas de gestão de pedidos', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('listar, buscar e atualizar status exigem autenticação', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const lista = await app.inject({ method: 'GET', url: '/api/orders' })
    const busca = await app.inject({ method: 'GET', url: '/api/orders/search?orderNumber=123456' })
    const status = await app.inject({
      method: 'PATCH',
      url: '/api/orders/123456/status',
      payload: { status: 'SOLD' },
    })

    expect(lista.statusCode).toBe(401)
    expect(busca.statusCode).toBe(401)
    expect(status.statusCode).toBe(401)
  })

  it('ignora filtro de status desconhecido na listagem', async () => {
    const findMany = vi.fn(async () => [])
    app = await buildTestApp(createPrismaFake({ order: { findMany } }))
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'GET',
      url: `/api/orders?status=${encodeURIComponent("'; DELETE FROM orders")}`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    // O valor inválido não chega à consulta — busca sem filtro
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }))
  })

  it('confirma venda e desconta o estoque dos produtos', async () => {
    const updateProduct = vi.fn(async () => ({}))
    app = await buildTestApp(
      createPrismaFake({
        order: {
          findUnique: vi.fn(async () => pedidoSalvo),
          update: vi.fn(async () => ({ ...pedidoSalvo, status: 'SOLD' })),
        },
        product: {
          findUnique: vi.fn(async () => ({ id: 'p1', name: 'Perfume Teste', brand: null, stock: 10 })),
          update: updateProduct,
        },
        notification: { upsert: vi.fn(async () => ({})) },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/orders/123456/status',
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'SOLD' },
    })

    expect(response.statusCode).toBe(200)
    // Estoque desce de 10 para 9 (1 unidade vendida)
    expect(updateProduct).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stock: 9 } })
    )
  })

  it('rejeita status diferente de SOLD/NOT_SOLD', async () => {
    app = await buildTestApp(
      createPrismaFake({
        order: { findUnique: vi.fn(async () => pedidoSalvo) },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/orders/123456/status',
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'HACKED' },
    })

    expect(response.statusCode).toBe(400)
  })
})
