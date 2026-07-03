// Integração com a Meta Catalog API — sincroniza produtos do Esqueleton com o catálogo do WhatsApp Business.
// Cada loja configura seu próprio token e catalog ID no perfil; sem eles, as operações são no-op.
import type { WhatsAppCatalogItem } from '@esqueleton/shared'

const META_GRAPH_API = 'https://graph.facebook.com/v21.0'

// Máximo de páginas seguidas ao listar produtos do catálogo (500 itens por página)
const MAX_PAGINAS_LISTAGEM = 10

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

/** Converte um item para o formato de request do endpoint /batch da Meta.
 *  Usa o método UPDATE porque na Meta ele funciona como upsert (cria se não
 *  existir, atualiza se existir) — CREATE falharia em toda edição de produto. */
function toBatchRequest(item: WhatsAppCatalogItem) {
  return {
    method: 'UPDATE',
    retailer_id: item.retailerId,
    data: {
      name: item.name,
      price: item.priceInCents,
      currency: item.currency,
      availability: item.availability,
      ...(item.imageUrl ? { image_url: item.imageUrl } : {}),
    },
  }
}

// Resposta do endpoint /batch — um 200 pode conter erros de validação por item,
// então response.ok sozinho NÃO significa que os produtos foram aceitos
type BatchResponse = {
  handles?: string[]
  validation_status?: Array<{
    retailer_id?: string
    errors?: Array<{ message?: string }>
  }>
}

/** Extrai os erros de validação por item de uma resposta 200 do /batch */
function errosDeValidacao(json: BatchResponse): string[] {
  if (!Array.isArray(json.validation_status)) return []
  const mensagens: string[] = []
  for (const status of json.validation_status) {
    for (const erro of status.errors ?? []) {
      if (erro.message) {
        mensagens.push(status.retailer_id ? `${status.retailer_id}: ${erro.message}` : erro.message)
      }
    }
  }
  return mensagens
}

/** Envia um lote de requests ao /batch e retorna os erros encontrados (vazio = sucesso).
 *  `allFailed` indica falha HTTP do lote inteiro (nenhum item foi aceito). */
async function enviarBatch(
  catalogId: string,
  accessToken: string,
  requests: Array<ReturnType<typeof toBatchRequest>>,
): Promise<{ ok: boolean; allFailed: boolean; errors: string[] }> {
  const response = await metaFetch(`/${catalogId}/batch`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } }
    return { ok: false, allFailed: true, errors: [errorData.error?.message ?? `Erro HTTP ${response.status}`] }
  }

  const json = await response.json().catch(() => ({})) as BatchResponse
  const erros = errosDeValidacao(json)
  return { ok: erros.length === 0, allFailed: false, errors: erros }
}

async function syncProduct(
  catalogId: string,
  accessToken: string,
  item: WhatsAppCatalogItem,
): Promise<boolean> {
  try {
    const resultado = await enviarBatch(catalogId, accessToken, [toBatchRequest(item)])
    return resultado.ok
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
    const response = await metaFetch(`/${catalogId}/batch`, accessToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ method: 'DELETE', retailer_id: retailerId }],
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

/** Converte o preço retornado pela Meta (string formatada, ex: "R$89,90") em centavos.
 *  Retorna 0 quando o formato não é reconhecido — o campo é apenas informativo. */
function parsePriceToCents(price: unknown): number {
  if (typeof price === 'number' && Number.isFinite(price)) return Math.round(price)
  if (typeof price !== 'string') return 0
  // Mantém apenas dígitos, vírgula e ponto; normaliza vírgula decimal para ponto
  const limpo = price.replace(/[^\d.,]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const valor = Number(limpo)
  return Number.isFinite(valor) ? Math.round(valor * 100) : 0
}

async function listProducts(
  catalogId: string,
  accessToken: string,
): Promise<WhatsAppCatalogItem[]> {
  try {
    const produtos: WhatsAppCatalogItem[] = []
    let url: string | null = `${META_GRAPH_API}/${catalogId}/products?fields=retailer_id,name,price,currency,availability,image_url&limit=500`

    // Segue a paginação da Meta — catálogos podem ter mais de 500 itens
    for (let pagina = 0; url && pagina < MAX_PAGINAS_LISTAGEM; pagina++) {
      const response: Response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!response.ok) break

      const json = await response.json() as {
        data?: Array<{
          retailer_id: string
          name: string
          price: string
          currency: string
          availability: string
          image_url?: string
        }>
        paging?: { next?: string }
      }

      for (const p of json.data ?? []) {
        produtos.push({
          retailerId: p.retailer_id,
          name: p.name,
          priceInCents: parsePriceToCents(p.price),
          currency: p.currency,
          availability: p.availability === 'in stock' ? 'in stock' as const : 'out of stock' as const,
          imageUrl: p.image_url,
        })
      }

      url = json.paging?.next ?? null
    }

    return produtos
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
      const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } }
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
  // A Meta aceita até 5.000 itens por batch; 100 por lote equilibra
  // número de chamadas (evita timeout em serverless) e tamanho da request
  const BATCH_SIZE = 100
  let synced = 0
  let failed = 0
  const errors: string[] = []

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)

    try {
      const resultado = await enviarBatch(catalogId, accessToken, batch.map(toBatchRequest))

      if (resultado.ok) {
        synced += batch.length
      } else if (resultado.allFailed) {
        // Erro HTTP — o lote inteiro foi rejeitado
        failed += batch.length
        errors.push(...resultado.errors)
      } else {
        // Itens com erro de validação contam como falha; os demais do lote foram aceitos
        const itensComErro = Math.min(resultado.errors.length, batch.length)
        failed += itensComErro
        synced += batch.length - itensComErro
        errors.push(...resultado.errors)
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
