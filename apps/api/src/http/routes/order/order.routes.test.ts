// Testes das rotas de pedidos — criação pública validada e gestão protegida
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken, LOJA_TESTE } from '../../../test/test-helpers'

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
  storeId: LOJA_TESTE.id,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('POST /api/lojas/:slug/orders (criação pública)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('cria um pedido com dados válidos na loja do slug', async () => {
    const create = vi.fn(async () => pedidoSalvo)
    app = await buildTestApp(
      createPrismaFake({
        order: { create },
        notification: { create: vi.fn(async () => ({})) },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: pedidoValido,
    })

    expect(response.statusCode).toBe(201)
    // O pedido nasce na loja do slug
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ storeId: LOJA_TESTE.id }) })
    )
  })

  it('rejeita número de pedido com caracteres inválidos', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: { ...pedidoValido, orderNumber: '123456; DROP TABLE' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('rejeita telefone com texto arbitrário', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: { ...pedidoValido, customerPhone: '<script>alert(1)</script>' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('rejeita pedido com totais manipulados (item de R$100 com total de R$1)', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: { ...pedidoValido, subtotal: 1, total: 1 },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('Os valores do pedido não conferem.')
  })

  it('rejeita desconto maior que o subtotal', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: { ...pedidoValido, discount: 999, total: 0 },
    })

    expect(response.statusCode).toBe(400)
  })

  it('registra o uso do cupom no servidor ao criar o pedido', async () => {
    const updateCoupon = vi.fn(async () => ({ count: 1 }))
    app = await buildTestApp(
      createPrismaFake({
        order: { create: vi.fn(async () => ({ ...pedidoSalvo, couponCode: 'DESCONTO10' })) },
        notification: { create: vi.fn(async () => ({})) },
        coupon: { updateMany: updateCoupon },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: { ...pedidoValido, couponCode: 'DESCONTO10', discount: 10, total: 90 },
    })

    expect(response.statusCode).toBe(201)
    // O contador de usos sobe no servidor — é assim que o maxUses é respeitado.
    // O filtro inclui a loja: cupom de mesmo código em outra loja não é afetado.
    expect(updateCoupon).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId: LOJA_TESTE.id, code: 'DESCONTO10' },
        data: { usedCount: { increment: 1 } },
      })
    )
  })

  it('rejeita pedido sem itens', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
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
    // O valor inválido não chega à consulta — busca apenas pela loja, sem filtro de status
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storeId: LOJA_TESTE.id } })
    )
  })

  it('busca de pedido usa a chave composta loja + número', async () => {
    const findUnique = vi.fn(async () => pedidoSalvo)
    app = await buildTestApp(createPrismaFake({ order: { findUnique } }))
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'GET',
      url: '/api/orders/search?orderNumber=123456',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    // Pedido de outra loja com o mesmo número nunca é retornado
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId_orderNumber: { storeId: LOJA_TESTE.id, orderNumber: '123456' } },
      })
    )
  })

  it('confirma venda atualizando o status do pedido', async () => {
    const updateOrder = vi.fn(async () => ({ count: 1 }))
    app = await buildTestApp(
      createPrismaFake({
        order: {
          findUnique: vi.fn(async () => pedidoSalvo),
          updateMany: updateOrder,
        },
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
    // A atualização é sempre restrita à loja do token
    expect(updateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: LOJA_TESTE.id }),
        data: { status: 'SOLD' },
      })
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
