// Sincronização fire-and-forget de um produto com o catálogo do WhatsApp Business.
// Chamado após criar, editar ou deletar um produto — nunca bloqueia a resposta da rota.
import type { PrismaClient } from '@prisma/client'
import type { WhatsAppCatalogItem } from '@esqueleton/shared'
import type { WhatsAppCatalogService } from '../integrations/whatsapp-catalog.adapter'
import type { FastifyBaseLogger } from 'fastify'

// Campos do produto necessários para montar o item do catálogo
export type ProdutoParaCatalogo = {
  id: string
  name: string
  price: number
  imageUrl: string | null
  isAvailable: boolean
}

/** Verifica se a imagem é URL pública (não base64) — a Meta Catalog API exige URL */
export function isPublicImageUrl(url: string | null | undefined): url is string {
  return Boolean(url && (url.startsWith('http://') || url.startsWith('https://')))
}

/** Converte um produto do banco para o formato da Meta Catalog API.
 *  Retorna null quando o produto não pode ser sincronizado (sem imagem pública —
 *  a Meta exige image_url em todo item do catálogo). */
export function productToCatalogItem(product: ProdutoParaCatalogo): WhatsAppCatalogItem | null {
  if (!isPublicImageUrl(product.imageUrl)) return null

  return {
    retailerId: product.id,
    name: product.name,
    priceInCents: Math.round(product.price * 100),
    currency: 'BRL',
    imageUrl: product.imageUrl,
    availability: product.isAvailable ? 'in stock' : 'out of stock',
  }
}

/** Sincroniza um produto criado ou editado com o catálogo do WhatsApp da loja */
export async function syncProductToWhatsApp(
  prisma: PrismaClient,
  whatsappCatalog: WhatsAppCatalogService,
  log: FastifyBaseLogger,
  storeId: string,
  productId: string,
): Promise<void> {
  try {
    const profile = await prisma.storeProfile.findUnique({
      where: { storeId },
      select: { metaAccessToken: true, metaCatalogId: true, whatsappCatalogEnabled: true },
    })

    // Loja sem integração configurada — nada a fazer
    if (!profile?.metaAccessToken || !profile?.metaCatalogId || !profile.whatsappCatalogEnabled) {
      return
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, storeId },
      select: { id: true, name: true, price: true, imageUrl: true, isAvailable: true },
    })

    if (!product) return

    const item = productToCatalogItem(product)
    if (!item) {
      // Sem imagem pública a Meta rejeita o item — registra para diagnóstico
      log.warn({ productId, storeId }, 'Produto sem imagem pública — não sincronizado com o catálogo WhatsApp')
      return
    }

    const ok = await whatsappCatalog.syncProduct(profile.metaCatalogId, profile.metaAccessToken, item)
    if (!ok) {
      log.warn({ productId, storeId }, 'Meta recusou a sincronização do produto com o catálogo WhatsApp')
    }
  } catch (err) {
    log.error(err, 'Falha ao sincronizar produto com catálogo WhatsApp')
  }
}

/** Remove um produto do catálogo do WhatsApp da loja */
export async function removeProductFromWhatsApp(
  prisma: PrismaClient,
  whatsappCatalog: WhatsAppCatalogService,
  log: FastifyBaseLogger,
  storeId: string,
  productId: string,
): Promise<void> {
  try {
    const profile = await prisma.storeProfile.findUnique({
      where: { storeId },
      select: { metaAccessToken: true, metaCatalogId: true, whatsappCatalogEnabled: true },
    })

    if (!profile?.metaAccessToken || !profile?.metaCatalogId || !profile.whatsappCatalogEnabled) {
      return
    }

    const ok = await whatsappCatalog.removeProduct(profile.metaCatalogId, profile.metaAccessToken, productId)
    if (!ok) {
      log.warn({ productId, storeId }, 'Meta recusou a remoção do produto do catálogo WhatsApp')
    }
  } catch (err) {
    log.error(err, 'Falha ao remover produto do catálogo WhatsApp')
  }
}
