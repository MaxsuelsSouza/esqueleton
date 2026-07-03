// Testes do serviço de sincronização com o catálogo do WhatsApp
import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import type { FastifyBaseLogger } from 'fastify'
import {
  isPublicImageUrl,
  productToCatalogItem,
  syncProductToWhatsApp,
  removeProductFromWhatsApp,
} from './whatsapp-sync.service'
import type { WhatsAppCatalogService } from '../integrations/whatsapp-catalog.adapter'

const PRODUTO = {
  id: 'produto-1',
  name: 'Produto Teste',
  price: 89.9,
  imageUrl: 'https://img.example.com/p1.webp',
  isAvailable: true,
}

const PERFIL_CONFIGURADO = {
  metaAccessToken: 'token-1',
  metaCatalogId: 'catalogo-1',
  whatsappCatalogEnabled: true,
}

function criarLogFake() {
  return { warn: vi.fn(), error: vi.fn() } as unknown as FastifyBaseLogger
}

function criarCatalogFake(overrides: Partial<WhatsAppCatalogService> = {}): WhatsAppCatalogService {
  return {
    syncProduct: vi.fn(async () => true),
    removeProduct: vi.fn(async () => true),
    listProducts: vi.fn(async () => []),
    testConnection: vi.fn(async () => ({ ok: true })),
    syncBatch: vi.fn(async () => ({ synced: 0, failed: 0, errors: [] })),
    ...overrides,
  }
}

function criarPrismaFake(perfil: unknown, produto: unknown): PrismaClient {
  return {
    storeProfile: { findUnique: vi.fn(async () => perfil) },
    product: { findFirst: vi.fn(async () => produto) },
  } as unknown as PrismaClient
}

describe('isPublicImageUrl', () => {
  it('aceita apenas URLs http(s) reais', () => {
    expect(isPublicImageUrl('https://img.example.com/a.webp')).toBe(true)
    expect(isPublicImageUrl('http://img.example.com/a.webp')).toBe(true)
    expect(isPublicImageUrl('data:image/png;base64,AAAA')).toBe(false)
    expect(isPublicImageUrl('httpfoo://estranho')).toBe(false)
    expect(isPublicImageUrl(null)).toBe(false)
    expect(isPublicImageUrl(undefined)).toBe(false)
  })
})

describe('productToCatalogItem', () => {
  it('converte o produto com preço em centavos', () => {
    const item = productToCatalogItem(PRODUTO)

    expect(item).toEqual({
      retailerId: 'produto-1',
      name: 'Produto Teste',
      priceInCents: 8990,
      currency: 'BRL',
      imageUrl: 'https://img.example.com/p1.webp',
      availability: 'in stock',
    })
  })

  it('retorna null quando o produto não tem imagem pública — a Meta exige image_url', () => {
    expect(productToCatalogItem({ ...PRODUTO, imageUrl: null })).toBeNull()
    expect(productToCatalogItem({ ...PRODUTO, imageUrl: 'data:image/png;base64,AAAA' })).toBeNull()
  })

  it('marca produto indisponível como out of stock', () => {
    const item = productToCatalogItem({ ...PRODUTO, isAvailable: false })
    expect(item?.availability).toBe('out of stock')
  })
})

describe('syncProductToWhatsApp', () => {
  it('não chama a Meta quando a integração está desligada ou sem credenciais', async () => {
    const catalog = criarCatalogFake()

    await syncProductToWhatsApp(
      criarPrismaFake({ ...PERFIL_CONFIGURADO, whatsappCatalogEnabled: false }, PRODUTO),
      catalog, criarLogFake(), 'loja-1', 'produto-1',
    )
    await syncProductToWhatsApp(
      criarPrismaFake({ ...PERFIL_CONFIGURADO, metaAccessToken: null }, PRODUTO),
      catalog, criarLogFake(), 'loja-1', 'produto-1',
    )

    expect(catalog.syncProduct).not.toHaveBeenCalled()
  })

  it('sincroniza o produto quando tudo está configurado', async () => {
    const catalog = criarCatalogFake()

    await syncProductToWhatsApp(
      criarPrismaFake(PERFIL_CONFIGURADO, PRODUTO),
      catalog, criarLogFake(), 'loja-1', 'produto-1',
    )

    expect(catalog.syncProduct).toHaveBeenCalledWith(
      'catalogo-1',
      'token-1',
      expect.objectContaining({ retailerId: 'produto-1', priceInCents: 8990 }),
    )
  })

  it('pula e registra aviso quando o produto não tem imagem pública', async () => {
    const catalog = criarCatalogFake()
    const log = criarLogFake()

    await syncProductToWhatsApp(
      criarPrismaFake(PERFIL_CONFIGURADO, { ...PRODUTO, imageUrl: 'data:image/png;base64,AAAA' }),
      catalog, log, 'loja-1', 'produto-1',
    )

    expect(catalog.syncProduct).not.toHaveBeenCalled()
    expect(log.warn).toHaveBeenCalled()
  })

  it('registra aviso quando a Meta recusa o produto — a falha não pode ser silenciosa', async () => {
    const catalog = criarCatalogFake({ syncProduct: vi.fn(async () => false) })
    const log = criarLogFake()

    await syncProductToWhatsApp(
      criarPrismaFake(PERFIL_CONFIGURADO, PRODUTO),
      catalog, log, 'loja-1', 'produto-1',
    )

    expect(log.warn).toHaveBeenCalled()
  })
})

describe('removeProductFromWhatsApp', () => {
  it('remove o produto quando a integração está configurada', async () => {
    const catalog = criarCatalogFake()

    await removeProductFromWhatsApp(
      criarPrismaFake(PERFIL_CONFIGURADO, null),
      catalog, criarLogFake(), 'loja-1', 'produto-1',
    )

    expect(catalog.removeProduct).toHaveBeenCalledWith('catalogo-1', 'token-1', 'produto-1')
  })

  it('não chama a Meta sem integração configurada', async () => {
    const catalog = criarCatalogFake()

    await removeProductFromWhatsApp(
      criarPrismaFake(null, null),
      catalog, criarLogFake(), 'loja-1', 'produto-1',
    )

    expect(catalog.removeProduct).not.toHaveBeenCalled()
  })
})
