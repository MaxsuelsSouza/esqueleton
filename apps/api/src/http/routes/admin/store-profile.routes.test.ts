// Testes da rota de onboarding-status do perfil da loja
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken, LOJA_TESTE } from '../../../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

describe('GET /api/store-profile/onboarding-status', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('requer autenticação', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'GET',
      url: '/api/store-profile/onboarding-status',
    })

    expect(response.statusCode).toBe(401)
  })

  it('retorna tudo false quando a loja não tem perfil nem produtos', async () => {
    app = await buildTestApp(
      createPrismaFake({
        storeProfile: {
          findUnique: vi.fn(async () => null),
          upsert: vi.fn(async () => ({ storeId: LOJA_TESTE.id, storeName: 'Minha Loja', themeColor: '#000000', announcements: [] })),
        },
        product: {
          count: vi.fn(async () => 0),
        },
      }),
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'GET',
      url: '/api/store-profile/onboarding-status',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toEqual({ whatsapp: false, logo: false, hasProducts: false })
  })

  it('retorna true para whatsapp e logo quando preenchidos', async () => {
    app = await buildTestApp(
      createPrismaFake({
        storeProfile: {
          findUnique: vi.fn(async () => ({
            storeId: LOJA_TESTE.id,
            whatsapp: '11999999999',
            logoUrl: 'https://example.com/logo.png',
          })),
          upsert: vi.fn(async () => ({ storeId: LOJA_TESTE.id })),
        },
        product: {
          count: vi.fn(async () => 0),
        },
      }),
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'GET',
      url: '/api/store-profile/onboarding-status',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.whatsapp).toBe(true)
    expect(body.logo).toBe(true)
    expect(body.hasProducts).toBe(false)
  })

  it('retorna hasProducts true quando existem produtos', async () => {
    app = await buildTestApp(
      createPrismaFake({
        storeProfile: {
          findUnique: vi.fn(async () => null),
          upsert: vi.fn(async () => ({ storeId: LOJA_TESTE.id, storeName: 'Minha Loja', themeColor: '#000000', announcements: [] })),
        },
        product: {
          count: vi.fn(async () => 3),
        },
      }),
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'GET',
      url: '/api/store-profile/onboarding-status',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().hasProducts).toBe(true)
  })
})
