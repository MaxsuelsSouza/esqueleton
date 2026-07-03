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

// Produto no banco com preço R$100 — bate com o unitPrice do pedidoValido
const produtoBanco = {
  id: 'p1',
  name: 'Perfume Teste',
  price: 100,
  storeId: LOJA_TESTE.id,
  isAvailable: true,
  variants: [],
}

// Monta os models mínimos para a criação de pedido funcionar (produto + promoção)
function orderModels(extras: Record<string, Record<string, (...args: unknown[]) => unknown>> = {}) {
  return {
    product: { findMany: vi.fn(async () => [produtoBanco]), ...extras.product },
    promotion: { findMany: vi.fn(async () => []), ...extras.promotion },
    ...extras,
  }
}

describe('POST /api/lojas/:slug/orders (criação pública)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('cria um pedido com dados válidos na loja do slug', async () => {
    const create = vi.fn(async () => pedidoSalvo)
    app = await buildTestApp(
      createPrismaFake(orderModels({
        order: { create },
        notification: { create: vi.fn(async () => ({})) },
      }))
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: pedidoValido,
    })

    expect(response.statusCode).toBe(201)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ storeId: LOJA_TESTE.id }) })
    )
  })

  it('rejeita número de pedido com caracteres inválidos', async () => {
    app = await buildTestApp(createPrismaFake(orderModels()))

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: { ...pedidoValido, orderNumber: '123456; DROP TABLE' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('rejeita telefone com texto arbitrário', async () => {
    app = await buildTestApp(createPrismaFake(orderModels()))

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: { ...pedidoValido, customerPhone: '<script>alert(1)</script>' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('rejeita pedido com totais manipulados (item de R$100 com total de R$1)', async () => {
    app = await buildTestApp(createPrismaFake(orderModels()))

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: { ...pedidoValido, subtotal: 1, total: 1 },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('Os valores do pedido não conferem.')
  })

  it('rejeita desconto maior que o subtotal', async () => {
    app = await buildTestApp(createPrismaFake(orderModels()))

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: { ...pedidoValido, discount: 999, total: 0 },
    })

    expect(response.statusCode).toBe(400)
  })

  it('registra o uso do cupom no servidor ao criar o pedido', async () => {
    const updateCoupon = vi.fn(async () => ({ count: 1 }))
    const couponData = {
      id: 'c1',
      code: 'DESCONTO10',
      discountType: 'fixed',
      discountValue: 10,
      discountPercent: null,
      productIds: [],
      active: true,
      startDate: null,
      endDate: null,
      maxUses: null,
      usedCount: 0,
      storeId: LOJA_TESTE.id,
    }
    app = await buildTestApp(
      createPrismaFake(orderModels({
        order: { create: vi.fn(async () => ({ ...pedidoSalvo, couponCode: 'DESCONTO10' })) },
        notification: { create: vi.fn(async () => ({})) },
        coupon: {
          findUnique: vi.fn(async () => couponData),
          updateMany: updateCoupon,
        },
      }))
    )

    // unitPrice = 90 (R$100 - R$10 do cupom fixo)
    const pedidoComCupom = {
      ...pedidoValido,
      items: [
        { productId: 'p1', productName: 'Perfume Teste', quantity: 1, unitPrice: 90, lineTotal: 90 },
      ],
      subtotal: 90,
      couponCode: 'DESCONTO10',
      discount: 0,
      total: 90,
    }

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: pedidoComCupom,
    })

    expect(response.statusCode).toBe(201)
    expect(updateCoupon).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId: LOJA_TESTE.id, code: 'DESCONTO10' },
        data: { usedCount: { increment: 1 } },
      })
    )
  })

  it('rejeita pedido sem itens', async () => {
    app = await buildTestApp(createPrismaFake(orderModels()))

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: { ...pedidoValido, items: [] },
    })

    expect(response.statusCode).toBe(400)
  })

  it('rejeita discount inventado sem promoção especial correspondente', async () => {
    app = await buildTestApp(createPrismaFake(orderModels()))

    // Sem promoção especial ativa, o único discount válido é 0.
    // Um pedido que declara desconto arbitrário deve ser recusado.
    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: {
        ...pedidoValido,
        items: [
          { productId: 'p1', productName: 'Perfume Teste', quantity: 1, unitPrice: 100, lineTotal: 100 },
        ],
        subtotal: 100,
        discount: 50,
        total: 50,
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('Os valores do pedido não conferem.')
  })

  it('rejeita cupom quando o pedido não atinge o valor mínimo', async () => {
    const couponData = {
      id: 'c1',
      code: 'MIN200',
      discountType: 'percentage',
      discountPercent: 10,
      discountValue: null,
      minimumOrderValue: 200,
      productIds: [],
      active: true,
      startDate: null,
      endDate: null,
      maxUses: null,
      maxUsesPerUser: null,
      usedCount: 0,
      storeId: LOJA_TESTE.id,
    }

    app = await buildTestApp(
      createPrismaFake(orderModels({
        coupon: {
          findUnique: vi.fn(async () => couponData),
          updateMany: vi.fn(async () => ({ count: 1 })),
        },
      }))
    )

    // Pedido de R$90 (com 10% off = R$90) não atinge o mínimo de R$200
    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: {
        ...pedidoValido,
        items: [
          { productId: 'p1', productName: 'Perfume Teste', quantity: 1, unitPrice: 90, lineTotal: 90 },
        ],
        subtotal: 90,
        couponCode: 'MIN200',
        discount: 0,
        total: 90,
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('O pedido não atinge o valor mínimo para usar este cupom.')
  })
})

describe('POST /api/lojas/:slug/orders (validação de preço contra o banco)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('rejeita pedido com unitPrice manipulado (menor que o preço real)', async () => {
    app = await buildTestApp(createPrismaFake(orderModels()))

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: {
        ...pedidoValido,
        items: [
          { productId: 'p1', productName: 'Perfume Teste', quantity: 1, unitPrice: 10, lineTotal: 10 },
        ],
        subtotal: 10,
        total: 10,
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('O preço de um ou mais produtos mudou. Atualize sua sacola.')
  })

  it('rejeita pedido com unitPrice manipulado (maior que o preço real)', async () => {
    app = await buildTestApp(createPrismaFake(orderModels()))

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: {
        ...pedidoValido,
        items: [
          { productId: 'p1', productName: 'Perfume Teste', quantity: 1, unitPrice: 500, lineTotal: 500 },
        ],
        subtotal: 500,
        total: 500,
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('O preço de um ou mais produtos mudou. Atualize sua sacola.')
  })

  it('rejeita pedido com produto inexistente no banco', async () => {
    app = await buildTestApp(
      createPrismaFake(orderModels({
        product: { findMany: vi.fn(async () => []) },
      }))
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: pedidoValido,
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('Um ou mais produtos do pedido não foram encontrados. Atualize sua sacola.')
  })

  it('aceita pedido com preço de variante ativa', async () => {
    const produtoComVariante = {
      ...produtoBanco,
      variants: [
        { id: 'v1', price: 150, active: true },
        { id: 'v2', price: 200, active: false },
      ],
    }

    app = await buildTestApp(
      createPrismaFake(orderModels({
        product: { findMany: vi.fn(async () => [produtoComVariante]) },
        order: { create: vi.fn(async () => pedidoSalvo) },
        notification: { create: vi.fn(async () => ({})) },
      }))
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: {
        ...pedidoValido,
        items: [
          { productId: 'p1', productName: 'Perfume Teste', quantity: 1, unitPrice: 150, lineTotal: 150 },
        ],
        subtotal: 150,
        total: 150,
      },
    })

    expect(response.statusCode).toBe(201)
  })

  it('rejeita pedido com preço de variante inativa', async () => {
    const produtoComVariante = {
      ...produtoBanco,
      variants: [
        { id: 'v1', price: 150, active: true },
        { id: 'v2', price: 200, active: false },
      ],
    }

    app = await buildTestApp(
      createPrismaFake(orderModels({
        product: { findMany: vi.fn(async () => [produtoComVariante]) },
      }))
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: {
        ...pedidoValido,
        items: [
          { productId: 'p1', productName: 'Perfume Teste', quantity: 1, unitPrice: 200, lineTotal: 200 },
        ],
        subtotal: 200,
        total: 200,
      },
    })

    expect(response.statusCode).toBe(400)
  })

  it('aceita pedido com preço promocional (desconto percentual)', async () => {
    const promoAtiva = {
      id: 'promo1',
      name: '20% OFF',
      type: 'percentage',
      discountPercent: 20,
      discountValue: null,
      kitPrice: null,
      productIds: ['p1'],
      startDate: null,
      endDate: null,
      startTime: null,
      endTime: null,
      active: true,
      priority: 0,
      storeId: LOJA_TESTE.id,
    }

    app = await buildTestApp(
      createPrismaFake(orderModels({
        promotion: { findMany: vi.fn(async () => [promoAtiva]) },
        order: { create: vi.fn(async () => pedidoSalvo) },
        notification: { create: vi.fn(async () => ({})) },
      }))
    )

    // R$100 com 20% de desconto = R$80
    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: {
        ...pedidoValido,
        items: [
          { productId: 'p1', productName: 'Perfume Teste', quantity: 1, unitPrice: 80, lineTotal: 80 },
        ],
        subtotal: 80,
        total: 80,
      },
    })

    expect(response.statusCode).toBe(201)
  })

  it('aceita pedido com preço de cupom percentual', async () => {
    const couponData = {
      id: 'c1',
      code: 'CUPOM20',
      discountType: 'percentage',
      discountPercent: 20,
      discountValue: null,
      productIds: [],
      active: true,
      startDate: null,
      endDate: null,
      maxUses: null,
      usedCount: 0,
      storeId: LOJA_TESTE.id,
    }

    app = await buildTestApp(
      createPrismaFake(orderModels({
        coupon: {
          findUnique: vi.fn(async () => couponData),
          updateMany: vi.fn(async () => ({ count: 1 })),
        },
        order: { create: vi.fn(async () => pedidoSalvo) },
        notification: { create: vi.fn(async () => ({})) },
      }))
    )

    // R$100 com cupom de 20% = R$80
    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: {
        ...pedidoValido,
        items: [
          { productId: 'p1', productName: 'Perfume Teste', quantity: 1, unitPrice: 80, lineTotal: 80 },
        ],
        subtotal: 80,
        couponCode: 'CUPOM20',
        discount: 0,
        total: 80,
      },
    })

    expect(response.statusCode).toBe(201)
  })

  it('aceita diferença de 1 centavo (arredondamento)', async () => {
    const produtoArredondamento = { ...produtoBanco, price: 99.99 }

    app = await buildTestApp(
      createPrismaFake(orderModels({
        product: { findMany: vi.fn(async () => [produtoArredondamento]) },
        order: { create: vi.fn(async () => pedidoSalvo) },
        notification: { create: vi.fn(async () => ({})) },
      }))
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/orders',
      payload: {
        ...pedidoValido,
        items: [
          { productId: 'p1', productName: 'Perfume Teste', quantity: 1, unitPrice: 99.98, lineTotal: 99.98 },
        ],
        subtotal: 99.98,
        total: 99.98,
      },
    })

    expect(response.statusCode).toBe(201)
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
