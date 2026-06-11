// Testes das rotas de analytics — registro público validado e métricas protegidas
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken, LOJA_TESTE } from '../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

describe('POST /api/lojas/:slug/analytics/events', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('registra um evento válido na loja do slug', async () => {
    const create = vi.fn(async () => ({}))
    app = await buildTestApp(createPrismaFake({ productEvent: { create } }))

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/analytics/events',
      payload: { productId: 'p1', productName: 'Perfume Teste', eventType: 'PRODUCT_VIEW' },
    })

    expect(response.statusCode).toBe(201)
    // O evento é gravado com a loja — as métricas de cada loja não se misturam
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ storeId: LOJA_TESTE.id }) })
    )
  })

  it('rejeita tipo de evento desconhecido', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/analytics/events',
      payload: { productId: 'p1', productName: 'Perfume', eventType: 'EVENTO_FALSO' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('rejeita ID de produto com formato inválido', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/analytics/events',
      payload: { productId: "p1' OR 1=1", productName: 'Perfume', eventType: 'PRODUCT_VIEW' },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('rotas protegidas de analytics', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('resumo e limpeza do funil exigem autenticação', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const resumo = await app.inject({ method: 'GET', url: '/api/analytics/summary' })
    const limpeza = await app.inject({ method: 'DELETE', url: '/api/analytics/events' })

    expect(resumo.statusCode).toBe(401)
    expect(limpeza.statusCode).toBe(401)
  })

  it('retorna o resumo da loja para um admin autenticado', async () => {
    const findManyEvents = vi.fn(async () => [])
    const findManyOrders = vi.fn(async () => [])
    app = await buildTestApp(
      createPrismaFake({
        productEvent: { findMany: findManyEvents },
        order: { findMany: findManyOrders },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'GET',
      url: '/api/analytics/summary',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().totalOrders).toBe(0)
    // Eventos e pedidos consultados apenas da loja do token
    expect(findManyEvents).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ storeId: LOJA_TESTE.id }) })
    )
    expect(findManyOrders).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ storeId: LOJA_TESTE.id }) })
    )
  })

  it('limpeza do funil apaga apenas os eventos da loja do token', async () => {
    const deleteMany = vi.fn(async () => ({ count: 0 }))
    app = await buildTestApp(createPrismaFake({ productEvent: { deleteMany } }))
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/analytics/events',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storeId: LOJA_TESTE.id } })
    )
  })
})
