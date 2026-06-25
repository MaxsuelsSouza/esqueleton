// Sincronização fire-and-forget de um produto com o catálogo do WhatsApp Business.
// Chamado após criar, editar ou deletar um produto — nunca bloqueia a resposta da rota.
import type { PrismaClient } from '@prisma/client'
import type { WhatsAppCatalogService } from '../integrations/whatsapp-catalog.adapter'
import type { FastifyBaseLogger } from 'fastify'

/** Verifica se a imagem é URL pública (não base64) */
function isPublicImageUrl(url: string | null | undefined): url is string {
  return Boolean(url && url.startsWith('http'))
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
    const profile = await (prisma as any).storeProfile.findUnique({
      where: { storeId },
      select: { metaAccessToken: true, metaCatalogId: true, whatsappCatalogEnabled: true },
    })

    // Loja sem integração configurada — nada a fazer
    if (!profile?.metaAccessToken || !profile?.metaCatalogId || !profile.whatsappCatalogEnabled) {
      return
    }

    const product = await (prisma as any).product.findFirst({
      where: { id: productId, storeId },
      select: { id: true, name: true, price: true, imageUrl: true, isAvailable: true },
    })

    if (!product) return

    await whatsappCatalog.syncProduct(profile.metaCatalogId, profile.metaAccessToken, {
      retailerId: product.id,
      name: product.name,
      priceInCents: Math.round(product.price * 100),
      currency: 'BRL',
      imageUrl: isPublicImageUrl(product.imageUrl) ? product.imageUrl : undefined,
      availability: product.isAvailable ? 'in stock' : 'out of stock',
    })
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
    const profile = await (prisma as any).storeProfile.findUnique({
      where: { storeId },
      select: { metaAccessToken: true, metaCatalogId: true, whatsappCatalogEnabled: true },
    })

    if (!profile?.metaAccessToken || !profile?.metaCatalogId || !profile.whatsappCatalogEnabled) {
      return
    }

    await whatsappCatalog.removeProduct(profile.metaCatalogId, profile.metaAccessToken, productId)
  } catch (err) {
    log.error(err, 'Falha ao remover produto do catálogo WhatsApp')
  }
}
