// Testes das rotas do perfil da loja (onboarding-status, leitura/edição e integração WhatsApp)
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken, LOJA_TESTE } from '../../../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

// Perfil completo como viria do banco, com a integração WhatsApp configurada
const PERFIL_COM_WHATSAPP = {
  id: 'perfil-1',
  storeId: LOJA_TESTE.id,
  storeName: 'Loja Teste',
  address: 'Rua Teste, 1',
  whatsapp: '5511999999999',
  instagram: 'lojateste',
  logoUrl: 'https://img.example.com/logo.webp',
  bannerUrl: 'https://img.example.com/banner.webp',
  bannerMobileUrl: 'https://img.example.com/banner-mobile.webp',
  bannerLink: 'https://instagram.com/lojateste',
  themeColor: '#000000',
  announcements: [],
  metaAccessToken: 'token-super-secreto',
  metaWabaId: 'waba-1',
  metaCatalogId: 'catalogo-1',
  whatsappCatalogEnabled: true,
  updatedAt: new Date(),
}

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

describe('GET /api/store-profile (admin) — token write-only', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('nunca devolve o metaAccessToken — informa apenas hasMetaAccessToken', async () => {
    app = await buildTestApp(
      createPrismaFake({
        storeProfile: { upsert: vi.fn(async () => PERFIL_COM_WHATSAPP) },
      }),
    )
    const token = await createTestToken(app, LOJA_TESTE.id, { role: 'STAFF' })

    const response = await app.inject({
      method: 'GET',
      url: '/api/store-profile',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.metaAccessToken).toBeUndefined()
    expect(body.hasMetaAccessToken).toBe(true)
    // Os IDs (não sensíveis) continuam visíveis para preencher o formulário
    expect(body.metaCatalogId).toBe('catalogo-1')
  })
})

describe('GET /api/lojas/:slug/store-profile (público) — allowlist', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('retorna apenas os campos públicos — nenhum campo da integração Meta', async () => {
    app = await buildTestApp(
      createPrismaFake({
        storeProfile: { findUnique: vi.fn(async () => PERFIL_COM_WHATSAPP) },
      }),
    )

    const response = await app.inject({
      method: 'GET',
      url: '/api/lojas/loja-teste/store-profile',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.storeName).toBe('Loja Teste')
    // Os banners são públicos — precisam sair no catálogo
    expect(body.bannerUrl).toBe('https://img.example.com/banner.webp')
    expect(body.bannerMobileUrl).toBe('https://img.example.com/banner-mobile.webp')
    expect(body.bannerLink).toBe('https://instagram.com/lojateste')
    expect(body.metaAccessToken).toBeUndefined()
    expect(body.metaCatalogId).toBeUndefined()
    expect(body.metaWabaId).toBeUndefined()
    expect(body.whatsappCatalogEnabled).toBeUndefined()
    expect(body.hasMetaAccessToken).toBeUndefined()
  })
})

describe('PUT /api/store-profile — limpar credenciais', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('string vazia limpa a credencial no banco (vira null)', async () => {
    const upsert = vi.fn(async () => ({ ...PERFIL_COM_WHATSAPP, metaAccessToken: null }))
    app = await buildTestApp(
      createPrismaFake({
        storeProfile: { upsert },
      }),
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'PUT',
      url: '/api/store-profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { metaAccessToken: '' },
    })

    expect(response.statusCode).toBe(200)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ metaAccessToken: null }),
      }),
    )
    expect(response.json().hasMetaAccessToken).toBe(false)
  })

  it('STAFF não pode editar o perfil', async () => {
    app = await buildTestApp(createPrismaFake({}))
    const token = await createTestToken(app, LOJA_TESTE.id, { role: 'STAFF' })

    const response = await app.inject({
      method: 'PUT',
      url: '/api/store-profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { storeName: 'Hackeada' },
    })

    expect(response.statusCode).toBe(403)
  })
})

describe('Rotas WhatsApp — permissões e pré-condições', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
    vi.unstubAllGlobals()
  })

  it('whatsapp-test exige credenciais configuradas', async () => {
    app = await buildTestApp(
      createPrismaFake({
        storeProfile: { findUnique: vi.fn(async () => ({ ...PERFIL_COM_WHATSAPP, metaAccessToken: null })) },
      }),
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/store-profile/whatsapp-test',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(400)
  })

  it('whatsapp-test é OWNER-only', async () => {
    app = await buildTestApp(createPrismaFake({}))
    const token = await createTestToken(app, LOJA_TESTE.id, { role: 'STAFF' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/store-profile/whatsapp-test',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(403)
  })

  it('whatsapp-sync recusa quando a sincronização está desligada', async () => {
    app = await buildTestApp(
      createPrismaFake({
        storeProfile: { findUnique: vi.fn(async () => ({ ...PERFIL_COM_WHATSAPP, whatsappCatalogEnabled: false })) },
      }),
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/store-profile/whatsapp-sync',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toContain('Ative a sincronização')
  })

  it('whatsapp-sync envia UPDATE à Meta e ignora produtos sem imagem pública', async () => {
    // O fetch global vira um fake — nenhuma chamada real à Meta
    const fetchFake = vi.fn(async () => ({ ok: true, json: async () => ({ handles: ['h1'] }) }))
    vi.stubGlobal('fetch', fetchFake)

    app = await buildTestApp(
      createPrismaFake({
        storeProfile: { findUnique: vi.fn(async () => PERFIL_COM_WHATSAPP) },
        product: {
          findMany: vi.fn(async () => [
            { id: 'p1', name: 'Com imagem', price: 10, imageUrl: 'https://img.example.com/p1.webp', isAvailable: true },
            { id: 'p2', name: 'Base64', price: 20, imageUrl: 'data:image/png;base64,AAAA', isAvailable: true },
          ]),
        },
      }),
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/store-profile/whatsapp-sync',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.synced).toBe(1)
    expect(body.skipped).toBe(1)
    expect(body.total).toBe(2)

    // Confere que o lote foi enviado com método UPDATE (upsert na Meta)
    const [, options] = fetchFake.mock.calls[0] as unknown as [string, RequestInit]
    const requestBody = JSON.parse(options.body as string)
    expect(requestBody.requests).toHaveLength(1)
    expect(requestBody.requests[0].method).toBe('UPDATE')
    expect(requestBody.requests[0].retailer_id).toBe('p1')
  })
})
