// Testes das rotas de analytics — registro público validado e métricas protegidas
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken } from '../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

describe('POST /api/analytics/events', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('registra um evento válido', async () => {
    app = await buildTestApp(
      createPrismaFake({
        productEvent: { create: vi.fn(async () => ({})) },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/analytics/events',
      payload: { productId: 'p1', productName: 'Perfume Teste', eventType: 'PRODUCT_VIEW' },
    })

    expect(response.statusCode).toBe(201)
  })

  it('rejeita tipo de evento desconhecido', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/analytics/events',
      payload: { productId: 'p1', productName: 'Perfume', eventType: 'EVENTO_FALSO' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('rejeita ID de produto com formato inválido', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/analytics/events',
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

  it('retorna o resumo para um admin autenticado', async () => {
    app = await buildTestApp(
      createPrismaFake({
        productEvent: { findMany: vi.fn(async () => []) },
        order: { findMany: vi.fn(async () => []) },
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
  })
})
