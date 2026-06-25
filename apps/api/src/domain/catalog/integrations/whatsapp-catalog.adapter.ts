// Integração com a Meta Catalog API — sincroniza produtos do Esqueleton com o catálogo do WhatsApp Business.
// Cada loja configura seu próprio token e catalog ID no perfil; sem eles, as operações são no-op.
import type { WhatsAppCatalogItem } from '@esqueleton/shared'

const META_GRAPH_API = 'https://graph.facebook.com/v21.0'

export interface WhatsAppCatalogService {
  /** Cria ou atualiza um produto no catálogo do WhatsApp */
  syncProduct(catalogId: string, accessToken: string, item: WhatsAppCatalogItem): Promise<boolean>

  /** Remove um produto do catálogo do WhatsApp */
  removeProduct(catalogId: string, accessToken: string, retailerId: string): Promise<boolean>

  /** Lista os produtos que estão no catálogo do WhatsApp */
  listProducts(catalogId: string, accessToken: string): Promise<WhatsAppCatalogItem[]>

  /** Testa se o token e o catalog ID são válidos */
  testConnection(catalogId: string, accessToken: string): Promise<{ ok: boolean; error?: string }>

  /** Sincroniza vários produtos de uma vez (batch) */
  syncBatch(catalogId: string, accessToken: string, items: WhatsAppCatalogItem[]): Promise<{
    synced: number
    failed: number
    errors: string[]
  }>
}

// ── Implementação real que chama a Meta Graph API ──

async function metaFetch(path: string, accessToken: string, options: RequestInit = {}): Promise<Response> {
  const url = `${META_GRAPH_API}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    ...options.headers as Record<string, string>,
  }
  return fetch(url, { ...options, headers })
}

async function syncProduct(
  catalogId: string,
  accessToken: string,
  item: WhatsAppCatalogItem,
): Promise<boolean> {
  try {
    const body = JSON.stringify({
      requests: [
        {
          method: 'CREATE',
          retailer_id: item.retailerId,
          data: {
            name: item.name,
            price: item.priceInCents,
            currency: item.currency,
            availability: item.availability,
            ...(item.imageUrl ? { image_url: item.imageUrl } : {}),
          },
        },
      ],
    })

    const response = await metaFetch(
      `/${catalogId}/batch`,
      accessToken,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      },
    )

    return response.ok
  } catch {
    return false
  }
}

async function removeProduct(
  catalogId: string,
  accessToken: string,
  retailerId: string,
): Promise<boolean> {
  try {
    const body = JSON.stringify({
      requests: [
        {
          method: 'DELETE',
          retailer_id: retailerId,
        },
      ],
    })

    const response = await metaFetch(
      `/${catalogId}/batch`,
      accessToken,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      },
    )

    return response.ok
  } catch {
    return false
  }
}

async function listProducts(
  catalogId: string,
  accessToken: string,
): Promise<WhatsAppCatalogItem[]> {
  try {
    const response = await metaFetch(
      `/${catalogId}/products?fields=retailer_id,name,price,currency,availability,image_url&limit=500`,
      accessToken,
    )

    if (!response.ok) return []

    const json = await response.json() as {
      data: Array<{
        retailer_id: string
        name: string
        price: string
        currency: string
        availability: string
        image_url?: string
      }>
    }

    return json.data.map((p) => ({
      retailerId: p.retailer_id,
      name: p.name,
      priceInCents: Number(p.price),
      currency: p.currency,
      availability: p.availability === 'in stock' ? 'in stock' as const : 'out of stock' as const,
      imageUrl: p.image_url,
    }))
  } catch {
    return []
  }
}

async function testConnection(
  catalogId: string,
  accessToken: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await metaFetch(
      `/${catalogId}?fields=id,name,product_count`,
      accessToken,
    )

    if (!response.ok) {
      const errorData = await response.json() as { error?: { message?: string } }
      return {
        ok: false,
        error: errorData.error?.message ?? `Erro HTTP ${response.status}`,
      }
    }

    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro de conexão com a Meta',
    }
  }
}

async function syncBatch(
  catalogId: string,
  accessToken: string,
  items: WhatsAppCatalogItem[],
): Promise<{ synced: number; failed: number; errors: string[] }> {
  // A Meta aceita até 5.000 itens por batch, mas vamos usar lotes de 20 para evitar timeout
  const BATCH_SIZE = 20
  let synced = 0
  let failed = 0
  const errors: string[] = []

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)

    const body = JSON.stringify({
      requests: batch.map((item) => ({
        method: 'CREATE',
        retailer_id: item.retailerId,
        data: {
          name: item.name,
          price: item.priceInCents,
          currency: item.currency,
          availability: item.availability,
          ...(item.imageUrl ? { image_url: item.imageUrl } : {}),
        },
      })),
    })

    try {
      const response = await metaFetch(
        `/${catalogId}/batch`,
        accessToken,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        },
      )

      if (response.ok) {
        synced += batch.length
      } else {
        failed += batch.length
        const errorData = await response.json() as { error?: { message?: string } }
        errors.push(errorData.error?.message ?? `Lote ${i / BATCH_SIZE + 1} falhou`)
      }
    } catch (err) {
      failed += batch.length
      errors.push(err instanceof Error ? err.message : `Erro no lote ${i / BATCH_SIZE + 1}`)
    }
  }

  return { synced, failed, errors }
}

/** Implementação real que chama a Meta Graph API */
export const whatsappCatalogService: WhatsAppCatalogService = {
  syncProduct,
  removeProduct,
  listProducts,
  testConnection,
  syncBatch,
}
