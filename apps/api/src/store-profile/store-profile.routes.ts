import type { FastifyPluginAsync } from 'fastify'
import { storeProfileSchema } from './store-profile.schema'

// ID fixo — a loja sempre tem um único perfil
const SINGLETON_ID = 'singleton'

export const storeProfileRoutes: FastifyPluginAsync = async (app) => {
  // Retorna o perfil da loja — cria com valores padrão se ainda não existir
  app.get('/', async () => {
    return app.prisma.storeProfile.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, storeName: 'Minha Loja', themeColor: '#000000' },
      update: {},
    })
  })

  // Atualiza o perfil da loja (requer JWT)
  app.put(
    '/',
    { preHandler: [app.authenticate] },
    async (request) => {
      const data = storeProfileSchema.parse(request.body)
      return app.prisma.storeProfile.upsert({
        where: { id: SINGLETON_ID },
        create: { id: SINGLETON_ID, ...data },
        update: data,
      })
    },
  )
}
