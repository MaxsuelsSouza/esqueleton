// Testes das rotas de cupons — proteção da lista e validação pública por código
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken } from '../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

const cupomValido = {
  id: 'c1',
  code: 'DESCONTO10',
  description: 'Dez por cento',
  discountType: 'percentage',
  discountPercent: 10,
  discountValue: null,
  minimumOrderValue: null,
  maxUses: 100,
  usedCount: 5,
  maxUsesPerUser: null,
  productIds: [],
  startDate: null,
  endDate: null,
  active: true,
  createdAt: new Date(),
}

describe('GET /api/coupons (lista de cupons)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('exige autenticação — a lista exporia todos os códigos de desconto', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({ method: 'GET', url: '/api/coupons' })

    expect(response.statusCode).toBe(401)
  })

  it('retorna a lista para um admin autenticado', async () => {
    app = await buildTestApp(
      createPrismaFake({
        coupon: { findMany: vi.fn(async () => [cupomValido]) },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'GET',
      url: '/api/coupons',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toHaveLength(1)
  })
})

describe('GET /api/coupons/codigo/:code (validação pública)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('retorna apenas os campos necessários para aplicar o desconto', async () => {
    app = await buildTestApp(
      createPrismaFake({
        coupon: { findUnique: vi.fn(async () => cupomValido) },
      })
    )

    const response = await app.inject({ method: 'GET', url: '/api/coupons/codigo/DESCONTO10' })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.code).toBe('DESCONTO10')
    expect(body.discountPercent).toBe(10)
    // Dados internos do cupom não devem vazar para o público
    expect(body.maxUses).toBeUndefined()
    expect(body.usedCount).toBeUndefined()
  })

  it('retorna 404 para cupom inexistente', async () => {
    app = await buildTestApp(
      createPrismaFake({
        coupon: { findUnique: vi.fn(async () => null) },
      })
    )

    const response = await app.inject({ method: 'GET', url: '/api/coupons/codigo/NAOEXISTE' })

    expect(response.statusCode).toBe(404)
  })

  it('rejeita código com formato inválido sem consultar o banco', async () => {
    const findUnique = vi.fn(async () => cupomValido)
    app = await buildTestApp(createPrismaFake({ coupon: { findUnique } }))

    const response = await app.inject({
      method: 'GET',
      url: `/api/coupons/codigo/${encodeURIComponent("' OR 1=1 --")}`,
    })

    expect(response.statusCode).toBe(404)
    expect(findUnique).not.toHaveBeenCalled()
  })

  it('recusa cupom desativado', async () => {
    app = await buildTestApp(
      createPrismaFake({
        coupon: { findUnique: vi.fn(async () => ({ ...cupomValido, active: false })) },
      })
    )

    const response = await app.inject({ method: 'GET', url: '/api/coupons/codigo/DESCONTO10' })

    expect(response.statusCode).toBe(404)
    expect(response.json().message).toBe('Este cupom não está disponível.')
  })

  it('recusa cupom expirado', async () => {
    app = await buildTestApp(
      createPrismaFake({
        coupon: { findUnique: vi.fn(async () => ({ ...cupomValido, endDate: '2020-01-01' })) },
      })
    )

    const response = await app.inject({ method: 'GET', url: '/api/coupons/codigo/DESCONTO10' })

    expect(response.statusCode).toBe(404)
    expect(response.json().message).toBe('Este cupom está expirado.')
  })

  it('recusa cupom que atingiu o limite de usos', async () => {
    app = await buildTestApp(
      createPrismaFake({
        coupon: { findUnique: vi.fn(async () => ({ ...cupomValido, maxUses: 5, usedCount: 5 })) },
      })
    )

    const response = await app.inject({ method: 'GET', url: '/api/coupons/codigo/DESCONTO10' })

    expect(response.statusCode).toBe(404)
    expect(response.json().message).toBe('Este cupom atingiu o limite de usos.')
  })
})

describe('rotas de gestão de cupons', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('POST, PUT e DELETE exigem autenticação', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const post = await app.inject({ method: 'POST', url: '/api/coupons', payload: {} })
    const put = await app.inject({ method: 'PUT', url: '/api/coupons/c1', payload: {} })
    const del = await app.inject({ method: 'DELETE', url: '/api/coupons/c1' })

    expect(post.statusCode).toBe(401)
    expect(put.statusCode).toBe(401)
    expect(del.statusCode).toBe(401)
  })

  it('rejeita criação de cupom com código contendo caracteres inválidos', async () => {
    app = await buildTestApp(
      createPrismaFake({
        coupon: { findUnique: vi.fn(async () => null) },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/coupons',
      headers: { authorization: `Bearer ${token}` },
      payload: { code: 'DESC ONTO<script>', discountType: 'percentage', discountPercent: 10 },
    })

    expect(response.statusCode).toBe(400)
  })
})
