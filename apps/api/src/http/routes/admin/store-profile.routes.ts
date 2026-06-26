// Rotas do perfil da loja — cada loja tem um perfil (logo, cores, contato).
//   - storeProfilePublicRoutes: leitura pelo catálogo público, a loja vem do slug na URL
//   - storeProfileAdminRoutes: leitura e edição pelo painel, a loja vem do token JWT
import type { FastifyPluginAsync } from 'fastify'
import { storeProfileSchema } from '../../schemas/store-profile.schema'
import { requireOwner } from '../../../domain/identity/guards/role.guard'
import { uploadImage } from '../../../shared/storage/image-upload.service'

// Valores padrão exibidos enquanto a loja ainda não configurou o perfil
const PERFIL_PADRAO = {
  storeName: 'Minha Loja',
  themeColor: '#000000',
  announcements: [] as string[],
}

// ── Rota pública — a loja vem do slug na URL ───────────────────────
export const storeProfilePublicRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request) => {
    const profile = await app.prisma.storeProfile.findUnique({
      where: { storeId: request.store!.id },
    })
    // Loja sem perfil configurado mostra os valores padrão — a leitura pública não cria registros
    return profile ?? { ...PERFIL_PADRAO, storeName: request.store!.name }
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
}
