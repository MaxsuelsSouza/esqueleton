// Testes das rotas de promoções — visão pública restrita às ativas
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken } from '../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

const promocaoInativa = {
  id: 'promo1',
  name: 'Promoção Secreta de Natal',
  type: 'percentage',
  discountPercent: 50,
  productIds: [],
  active: false,
  createdAt: new Date(),
}

describe('GET /api/promotions', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('público recebe apenas promoções ativas', async () => {
    const findMany = vi.fn(async () => [])
    app = await buildTestApp(createPrismaFake({ promotion: { findMany } }))

    await app.inject({ method: 'GET', url: '/api/promotions' })

    // Promoções desativadas/agendadas são informação interna da loja
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { active: true } })
    )
  })

  it('admin autenticado recebe a lista completa', async () => {
    const findMany = vi.fn(async () => [])
    app = await buildTestApp(createPrismaFake({ promotion: { findMany } }))
    const token = await createTestToken(app)

    await app.inject({
      method: 'GET',
      url: '/api/promotions',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }))
  })

  it('promoção inativa não é visível para o público nem por ID', async () => {
    app = await buildTestApp(
      createPrismaFake({
        promotion: { findUnique: vi.fn(async () => promocaoInativa) },
      })
    )

    const response = await app.inject({ method: 'GET', url: '/api/promotions/promo1' })

    expect(response.statusCode).toBe(404)
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
})
