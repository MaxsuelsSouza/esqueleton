// Testes do adapter da Meta Catalog API — o fetch global é substituído por um fake,
// então nenhum teste fala com a Meta de verdade.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { whatsappCatalogService } from './whatsapp-catalog.adapter'
import type { WhatsAppCatalogItem } from '@esqueleton/shared'

const ITEM: WhatsAppCatalogItem = {
  retailerId: 'produto-1',
  name: 'Produto Teste',
  priceInCents: 8990,
  currency: 'BRL',
  imageUrl: 'https://img.example.com/produto-1.webp',
  availability: 'in stock',
}

function fetchOk(body: unknown) {
  return vi.fn(async () => ({ ok: true, json: async () => body }))
}

function fetchErro(status: number, body: unknown = {}) {
  return vi.fn(async () => ({ ok: false, status, json: async () => body }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('syncProduct', () => {
  it('envia o produto com método UPDATE (upsert) — CREATE falharia em edições', async () => {
    const fetchFake = fetchOk({ handles: ['h1'] })
    vi.stubGlobal('fetch', fetchFake)

    const ok = await whatsappCatalogService.syncProduct('catalogo-1', 'token-1', ITEM)

    expect(ok).toBe(true)
    const [url, options] = fetchFake.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('/catalogo-1/batch')
    const body = JSON.parse(options.body as string)
    expect(body.requests[0].method).toBe('UPDATE')
    expect(body.requests[0].retailer_id).toBe('produto-1')
    expect(body.requests[0].data.image_url).toBe(ITEM.imageUrl)
  })

  it('retorna false quando a Meta devolve erros de validação mesmo com HTTP 200', async () => {
    vi.stubGlobal('fetch', fetchOk({
      handles: ['h1'],
      validation_status: [{ retailer_id: 'produto-1', errors: [{ message: 'Imagem inválida' }] }],
    }))

    const ok = await whatsappCatalogService.syncProduct('catalogo-1', 'token-1', ITEM)

    expect(ok).toBe(false)
  })

  it('retorna false em erro HTTP', async () => {
    vi.stubGlobal('fetch', fetchErro(400, { error: { message: 'Token inválido' } }))

    const ok = await whatsappCatalogService.syncProduct('catalogo-1', 'token-1', ITEM)

    expect(ok).toBe(false)
  })
})

describe('syncBatch', () => {
  it('conta o lote inteiro como falha em erro HTTP', async () => {
    vi.stubGlobal('fetch', fetchErro(401, { error: { message: 'Token expirado' } }))

    const result = await whatsappCatalogService.syncBatch('catalogo-1', 'token-1', [ITEM, { ...ITEM, retailerId: 'produto-2' }])

    expect(result.synced).toBe(0)
    expect(result.failed).toBe(2)
    expect(result.errors).toContain('Token expirado')
  })

  it('conta falhas por item quando o 200 traz erros de validação', async () => {
    vi.stubGlobal('fetch', fetchOk({
      handles: ['h1'],
      validation_status: [{ retailer_id: 'produto-2', errors: [{ message: 'Preço inválido' }] }],
    }))

    const result = await whatsappCatalogService.syncBatch('catalogo-1', 'token-1', [ITEM, { ...ITEM, retailerId: 'produto-2' }])

    expect(result.synced).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.errors[0]).toContain('Preço inválido')
  })
})

describe('listProducts', () => {
  it('segue a paginação da Meta e converte o preço formatado para centavos', async () => {
    const pagina1 = {
      data: [{ retailer_id: 'p1', name: 'A', price: 'R$89,90', currency: 'BRL', availability: 'in stock' }],
      paging: { next: 'https://graph.facebook.com/v21.0/catalogo-1/products?after=abc' },
    }
    const pagina2 = {
      data: [{ retailer_id: 'p2', name: 'B', price: '1.234,56', currency: 'BRL', availability: 'out of stock' }],
    }
    const fetchFake = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => pagina1 })
      .mockResolvedValueOnce({ ok: true, json: async () => pagina2 })
    vi.stubGlobal('fetch', fetchFake)

    const produtos = await whatsappCatalogService.listProducts('catalogo-1', 'token-1')

    expect(produtos).toHaveLength(2)
    expect(produtos[0].priceInCents).toBe(8990)
    expect(produtos[1].priceInCents).toBe(123456)
    expect(produtos[1].availability).toBe('out of stock')
    expect(fetchFake).toHaveBeenCalledTimes(2)
  })

  it('retorna lista vazia em erro HTTP', async () => {
    vi.stubGlobal('fetch', fetchErro(500))

    const produtos = await whatsappCatalogService.listProducts('catalogo-1', 'token-1')

    expect(produtos).toEqual([])
  })
})

describe('testConnection', () => {
  it('retorna ok true quando a Meta responde 200', async () => {
    vi.stubGlobal('fetch', fetchOk({ id: 'catalogo-1', name: 'Catálogo' }))

    const result = await whatsappCatalogService.testConnection('catalogo-1', 'token-1')

    expect(result.ok).toBe(true)
  })

  it('extrai a mensagem de erro da Meta em falha', async () => {
    vi.stubGlobal('fetch', fetchErro(400, { error: { message: 'Invalid OAuth access token' } }))

    const result = await whatsappCatalogService.testConnection('catalogo-1', 'token-1')

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Invalid OAuth access token')
  })
})
