// Testes das rotas de promoções — visão pública restrita às ativas da loja
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken, LOJA_TESTE } from '../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

const promocaoInativa = {
  id: 'promo1',
  name: 'Promoção Secreta de Natal',
  type: 'percentage',
  discountPercent: 50,
  productIds: [],
  active: false,
  storeId: LOJA_TESTE.id,
  createdAt: new Date(),
}

describe('GET /api/lojas/:slug/promotions (visão pública)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('público recebe apenas promoções ativas da loja', async () => {
    const findMany = vi.fn(async () => [])
    app = await buildTestApp(createPrismaFake({ promotion: { findMany } }))

    await app.inject({ method: 'GET', url: '/api/lojas/loja-teste/promotions' })

    // Promoções desativadas/agendadas são informação interna da loja
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storeId: LOJA_TESTE.id, active: true } })
    )
  })

  it('promoção inativa não é visível para o público nem por ID', async () => {
    app = await buildTestApp(
      createPrismaFake({
        // findFirst com active: true não encontra a promoção inativa
        promotion: { findFirst: vi.fn(async () => null) },
      })
    )

    const response = await app.inject({
      method: 'GET',
      url: '/api/lojas/loja-teste/promotions/promo1',
    })

    expect(response.statusCode).toBe(404)
  })
})

describe('rotas admin de promoções', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('lista completa exige autenticação', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({ method: 'GET', url: '/api/promotions' })

    expect(response.statusCode).toBe(401)
  })

  it('admin autenticado recebe a lista completa da própria loja', async () => {
    const findMany = vi.fn(async () => [promocaoInativa])
    app = await buildTestApp(createPrismaFake({ promotion: { findMany } }))
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'GET',
      url: '/api/promotions',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storeId: LOJA_TESTE.id } })
    )
  })

  it('escrita exige autenticação', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const post = await app.inject({ method: 'POST', url: '/api/promotions', payload: {} })
    const put = await app.inject({ method: 'PUT', url: '/api/promotions/promo1', payload: {} })
    const del = await app.inject({ method: 'DELETE', url: '/api/promotions/promo1' })

    expect(post.statusCode).toBe(401)
    expect(put.statusCode).toBe(401)
    expect(del.statusCode).toBe(401)
  })

  it('não altera promoção de outra loja (responde 404)', async () => {
    app = await buildTestApp(
      createPrismaFake({
        // updateMany com id + storeId não encontra nada — a promoção é de outra loja
        promotion: { updateMany: vi.fn(async () => ({ count: 0 })) },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'PUT',
      url: '/api/promotions/promo-de-outra-loja',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'tentativa' },
    })

    expect(response.statusCode).toBe(404)
  })
})
