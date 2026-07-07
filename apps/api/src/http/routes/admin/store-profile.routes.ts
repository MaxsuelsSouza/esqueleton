// Rotas do perfil da loja — cada loja tem um perfil (logo, cores, contato).
//   - storeProfilePublicRoutes: leitura pelo catálogo público, a loja vem do slug na URL
//   - storeProfileAdminRoutes: leitura e edição pelo painel, a loja vem do token JWT
import type { FastifyPluginAsync } from 'fastify'
import { storeProfileSchema } from '../../schemas/store-profile.schema'
import { requireOwner } from '../../../domain/identity/guards/role.guard'
import type { WhatsAppCatalogItem } from '@esqueleton/shared'
import { uploadImage } from '../../../shared/storage/image-upload.service'
import { productToCatalogItem } from '../../../domain/catalog/services/whatsapp-sync.service'

// Valores padrão exibidos enquanto a loja ainda não configurou o perfil
const PERFIL_PADRAO = {
  storeName: 'Minha Loja',
  themeColor: '#000000',
  announcements: [] as string[],
}

// Allowlist: somente estes campos vão para o catálogo público.
// Preferimos listar o que PODE sair (em vez de remover o que não pode) —
// assim um campo sensível novo no modelo nunca vaza por esquecimento.
const CAMPOS_PUBLICOS = [
  'id',
  'storeId',
  'storeName',
  'address',
  'whatsapp',
  'instagram',
  'logoUrl',
  'bannerUrl',
  'bannerMobileUrl',
  'bannerLink',
  'themeColor',
  'announcements',
  'updatedAt',
] as const

/** Mantém apenas os campos públicos do perfil antes de enviar ao catálogo */
function apenasCamposPublicos(profile: Record<string, unknown>) {
  const publico: Record<string, unknown> = {}
  for (const campo of CAMPOS_PUBLICOS) {
    if (campo in profile) publico[campo] = profile[campo]
  }
  return publico
}

/** Remove o token da Meta da resposta — o token é write-only:
 *  o painel só precisa saber SE existe um token salvo, nunca o valor. */
function semTokenMeta<T extends { metaAccessToken?: string | null }>(profile: T) {
  const { metaAccessToken, ...semToken } = profile
  return { ...semToken, hasMetaAccessToken: Boolean(metaAccessToken) }
}

// Filtro Prisma para "produto com imagem pública" — precisa casar com isPublicImageUrl
const IMAGEM_PUBLICA_WHERE = {
  OR: [
    { imageUrl: { startsWith: 'http://' } },
    { imageUrl: { startsWith: 'https://' } },
  ],
}

// ── Rota pública — a loja vem do slug na URL ───────────────────────
export const storeProfilePublicRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request) => {
    const profile = await app.prisma.storeProfile.findUnique({
      where: { storeId: request.store!.id },
    })
    // Loja sem perfil configurado mostra os valores padrão — a leitura pública não cria registros
    if (!profile) return { ...PERFIL_PADRAO, storeName: request.store!.name }
    return apenasCamposPublicos(profile)
  })
}

// ── Rotas do admin — a loja vem do token JWT ───────────────────────
export const storeProfileAdminRoutes: FastifyPluginAsync = async (app) => {
  // Todas as rotas deste grupo exigem login
  app.addHook('preHandler', app.authenticate)

  // Retorna o perfil da loja — cria com valores padrão se ainda não existir.
  // O token da Meta nunca é devolvido (write-only) — qualquer membro da equipe
  // pode ler o perfil, mas só o OWNER define o token e ninguém o lê de volta.
  app.get('/', async (request) => {
    const storeId = request.user.storeId
    const profile = await app.prisma.storeProfile.upsert({
      where: { storeId },
      create: { storeId, ...PERFIL_PADRAO },
      update: {},
    })
    return semTokenMeta(profile)
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

    // Faz upload do logo para o R2 se for base64.
    // null significa "remover o logo" — passa direto para o banco sem upload.
    if (data.logoUrl != null) {
      data.logoUrl = await uploadImage(app.storage, request.log, data.logoUrl, storeId, 'stores', storeId)
    }

    // Mesmo tratamento para os banners do catálogo — null remove, base64 vai para o R2
    if (data.bannerUrl != null) {
      data.bannerUrl = await uploadImage(app.storage, request.log, data.bannerUrl, storeId, 'stores', storeId)
    }
    if (data.bannerMobileUrl != null) {
      data.bannerMobileUrl = await uploadImage(app.storage, request.log, data.bannerMobileUrl, storeId, 'stores', storeId)
    }

    const profile = await app.prisma.storeProfile.upsert({
      where: { storeId },
      create: { storeId, ...data },
      update: data,
    })
    return semTokenMeta(profile)
  })

  // ── Integração com o catálogo do WhatsApp Business ──────────────

  // Testa se o token e catalog ID da Meta são válidos
  app.post('/whatsapp-test', {
    preHandler: [requireOwner],
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
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
  app.get('/whatsapp-status', {
    preHandler: [requireOwner],
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request) => {
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

    // Conta quantos produtos locais não têm imagem pública (não sincronizáveis) —
    // mesmo critério usado pelo sync (isPublicImageUrl)
    const [totalLocal, withPublicImage] = await Promise.all([
      app.prisma.product.count({ where: { storeId } }),
      app.prisma.product.count({ where: { storeId, ...IMAGEM_PUBLICA_WHERE } }),
    ])

    return {
      connected: true,
      syncedProducts: remoteProducts.length,
      skippedProducts: totalLocal - withPublicImage,
    }
  })

  // Sincroniza todos os produtos da loja com o catálogo do WhatsApp (lote completo)
  app.post('/whatsapp-sync', {
    preHandler: [requireOwner],
    config: { rateLimit: { max: 2, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const storeId = request.user.storeId
    const profile = await app.prisma.storeProfile.findUnique({ where: { storeId } })

    if (!profile?.metaAccessToken || !profile?.metaCatalogId) {
      return reply.status(400).send({
        message: 'Configure o token e o ID do catálogo antes de sincronizar',
      })
    }

    // Mesma regra do sync automático e do status: a integração precisa estar ativada
    if (!profile.whatsappCatalogEnabled) {
      return reply.status(400).send({
        message: 'Ative a sincronização com o WhatsApp antes de sincronizar',
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
