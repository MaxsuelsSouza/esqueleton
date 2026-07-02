// Rotas do perfil da loja — cada loja tem um perfil (logo, cores, contato).
//   - storeProfilePublicRoutes: leitura pelo catálogo público, a loja vem do slug na URL
//   - storeProfileAdminRoutes: leitura e edição pelo painel, a loja vem do token JWT
import type { FastifyPluginAsync } from 'fastify'
import { storeProfileSchema } from '../../schemas/store-profile.schema'
import { requireOwner } from '../../../domain/identity/guards/role.guard'
import type { WhatsAppCatalogItem } from '@esqueleton/shared'
import { uploadImage } from '../../../shared/storage/image-upload.service'

// Valores padrão exibidos enquanto a loja ainda não configurou o perfil
const PERFIL_PADRAO = {
  storeName: 'Minha Loja',
  themeColor: '#000000',
  announcements: [] as string[],
}

// Campos sensíveis que não devem ir para o catálogo público
const CAMPOS_SENSIVEIS = ['metaAccessToken', 'metaWabaId', 'metaCatalogId'] as const

/** Remove campos de integração Meta do objeto antes de enviar ao público */
function semCamposSensiveis<T extends Record<string, unknown>>(obj: T): Omit<T, 'metaAccessToken' | 'metaWabaId' | 'metaCatalogId'> {
  const copia = { ...obj }
  for (const campo of CAMPOS_SENSIVEIS) {
    delete (copia as Record<string, unknown>)[campo]
  }
  return copia
}

/** Verifica se a imagem é URL pública (não base64) — a Meta Catalog API exige URL */
function isPublicImageUrl(url: string | null | undefined): url is string {
  return Boolean(url && url.startsWith('http'))
}

/** Converte um produto do banco para o formato da Meta Catalog API */
function productToCatalogItem(product: {
  id: string
  name: string
  price: number
  imageUrl: string | null
  isAvailable: boolean
}): WhatsAppCatalogItem | null {
  return {
    retailerId: product.id,
    name: product.name,
    priceInCents: Math.round(product.price * 100),
    currency: 'BRL',
    imageUrl: isPublicImageUrl(product.imageUrl) ? product.imageUrl : undefined,
    availability: product.isAvailable ? 'in stock' : 'out of stock',
  }
}

// ── Rota pública — a loja vem do slug na URL ───────────────────────
export const storeProfilePublicRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request) => {
    const profile = await app.prisma.storeProfile.findUnique({
      where: { storeId: request.store!.id },
    })
    // Loja sem perfil configurado mostra os valores padrão — a leitura pública não cria registros
    if (!profile) return { ...PERFIL_PADRAO, storeName: request.store!.name }
    return semCamposSensiveis(profile)
  })
}

// ── Rotas do admin — a loja vem do token JWT ───────────────────────
export const storeProfileAdminRoutes: FastifyPluginAsync = async (app) => {
  // Todas as rotas deste grupo exigem login
  app.addHook('preHandler', app.authenticate)

  // Retorna o perfil da loja — cria com valores padrão se ainda não existir
  app.get('/', async (request) => {
    const storeId = request.user.storeId
    return app.prisma.storeProfile.upsert({
      where: { storeId },
      create: { storeId, ...PERFIL_PADRAO },
      update: {},
    })
  })

  // Retorna o progresso do onboarding — usado pelo Dashboard para exibir o checklist inicial
  app.get('/onboarding-status', async (request) => {
    const storeId = request.user.storeId

    const [profile, productCount] = await Promise.all([
      app.prisma.storeProfile.findUnique({ where: { storeId } }),
      app.prisma.product.count({ where: { storeId } }),
    ])

    return {
      whatsapp: Boolean(profile?.whatsapp),
      logo: Boolean(profile?.logoUrl),
      hasProducts: productCount > 0,
    }
  })

  // Atualiza o perfil da loja
  // Apenas o OWNER pode editar o perfil da loja
  app.put('/', { preHandler: [requireOwner] }, async (request) => {
    const storeId = request.user.storeId
    const data = storeProfileSchema.partial().parse(request.body)

    // Faz upload do logo para o R2 se for base64
    if (data.logoUrl !== undefined) {
      data.logoUrl = await uploadImage(app.storage, request.log, data.logoUrl, storeId, 'stores', storeId)
    }

    return app.prisma.storeProfile.upsert({
      where: { storeId },
      create: { storeId, ...data },
      update: data,
    })
  })

  // ── Integração com o catálogo do WhatsApp Business ──────────────

  // Testa se o token e catalog ID da Meta são válidos
  app.post('/whatsapp-test', { preHandler: [requireOwner] }, async (request, reply) => {
    const storeId = request.user.storeId
    const profile = await app.prisma.storeProfile.findUnique({ where: { storeId } })

    if (!profile?.metaAccessToken || !profile?.metaCatalogId) {
      return reply.status(400).send({
        message: 'Configure o token e o ID do catálogo antes de testar a conexão',
      })
    }

    const result = await app.whatsappCatalog.testConnection(
      profile.metaCatalogId,
      profile.metaAccessToken,
    )

    return result
  })

  // Retorna o status da sincronização (quantos produtos estão no catálogo)
  app.get('/whatsapp-status', { preHandler: [requireOwner] }, async (request) => {
    const storeId = request.user.storeId
    const profile = await app.prisma.storeProfile.findUnique({ where: { storeId } })

    if (!profile?.metaAccessToken || !profile?.metaCatalogId || !profile.whatsappCatalogEnabled) {
      return { connected: false, syncedProducts: 0, skippedProducts: 0 }
    }

    const connectionTest = await app.whatsappCatalog.testConnection(
      profile.metaCatalogId,
      profile.metaAccessToken,
    )

    if (!connectionTest.ok) {
      return { connected: false, error: connectionTest.error, syncedProducts: 0, skippedProducts: 0 }
    }

    const remoteProducts = await app.whatsappCatalog.listProducts(
      profile.metaCatalogId,
      profile.metaAccessToken,
    )

    // Conta quantos produtos locais têm imagem base64 (não sincronizáveis)
    const totalLocal = await app.prisma.product.count({ where: { storeId } })
    const withPublicImage = await app.prisma.product.count({
      where: {
        storeId,
        imageUrl: { not: null, startsWith: 'http' },
      },
    })

    return {
      connected: true,
      syncedProducts: remoteProducts.length,
      skippedProducts: totalLocal - withPublicImage,
    }
  })

  // Sincroniza todos os produtos da loja com o catálogo do WhatsApp (lote completo)
  app.post('/whatsapp-sync', { preHandler: [requireOwner] }, async (request, reply) => {
    const storeId = request.user.storeId
    const profile = await app.prisma.storeProfile.findUnique({ where: { storeId } })

    if (!profile?.metaAccessToken || !profile?.metaCatalogId) {
      return reply.status(400).send({
        message: 'Configure o token e o ID do catálogo antes de sincronizar',
      })
    }

    // Busca todos os produtos da loja
    const products = await app.prisma.product.findMany({
      where: { storeId },
      select: { id: true, name: true, price: true, imageUrl: true, isAvailable: true },
    })

    // Converte para o formato da Meta — ignora produtos sem imagem pública
    const items: WhatsAppCatalogItem[] = []
    let skipped = 0

    for (const product of products) {
      const item = productToCatalogItem(product)
      if (item) {
        items.push(item)
      } else {
        skipped++
      }
    }

    const result = await app.whatsappCatalog.syncBatch(
      profile.metaCatalogId,
      profile.metaAccessToken,
      items,
    )

    return {
      ...result,
      skipped,
      total: products.length,
    }
  })
}
