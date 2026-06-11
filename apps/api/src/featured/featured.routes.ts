// Rotas de seções em destaque — divididas em dois grupos:
//   - featuredPublicRoutes: catálogo público vê apenas destaques ativos, a loja vem do slug
//   - featuredAdminRoutes: gestão pelo painel (lista completa), a loja vem do token JWT
import type { FastifyPluginAsync } from 'fastify'
import { featuredSchema } from './featured.schema'
import { idParamSchema } from '../common/validation'

// ── Rotas públicas — a loja vem do slug na URL ─────────────────────
export const featuredPublicRoutes: FastifyPluginAsync = async (app) => {
  // Público vê apenas destaques ativos — os desativados e agendados são informação interna da loja
  app.get('/', async (request) => {
    return app.prisma.featured.findMany({
      where: { storeId: request.store!.id, active: true },
      orderBy: { createdAt: 'desc' },
    })
  })

  app.get('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const featured = await app.prisma.featured.findFirst({
      where: { id, storeId: request.store!.id, active: true },
    })
    if (!featured) {
      return reply.status(404).send({ message: 'Destaque não encontrado' })
    }
    return featured
  })
}

// ── Rotas do admin — a loja vem do token JWT ───────────────────────
export const featuredAdminRoutes: FastifyPluginAsync = async (app) => {
  // Todas as rotas deste grupo exigem login
  app.addHook('preHandler', app.authenticate)

  // Lista completa, incluindo destaques desativados e agendados
  app.get('/', async (request) => {
    return app.prisma.featured.findMany({
      where: { storeId: request.user.storeId },
      orderBy: { createdAt: 'desc' },
    })
  })

  app.get('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const featured = await app.prisma.featured.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!featured) {
      return reply.status(404).send({ message: 'Destaque não encontrado' })
    }
    return featured
  })

  app.post('/', async (request, reply) => {
    const storeId = request.user.storeId
    const data = featuredSchema.parse(request.body)

    // Apenas um destaque pode estar ativo por vez NA LOJA — desativa todos antes de ativar o novo
    if (data.active) {
      await app.prisma.featured.updateMany({ where: { storeId }, data: { active: false } })
    }

    const featured = await app.prisma.featured.create({ data: { ...data, storeId } })
    return reply.status(201).send(featured)
  })

  app.put('/:id', async (request, reply) => {
    const storeId = request.user.storeId
    const { id } = idParamSchema.parse(request.params)
    const data = featuredSchema.partial().parse(request.body)

    // Se este destaque está sendo ativado, desativa todos os outros da loja primeiro
    if (data.active) {
      await app.prisma.featured.updateMany({
        where: { storeId, id: { not: id } },
        data: { active: false },
      })
    }

    const { count } = await app.prisma.featured.updateMany({ where: { id, storeId }, data })
    if (count === 0) {
      return reply.status(404).send({ message: 'Destaque não encontrado' })
    }
    return app.prisma.featured.findFirst({ where: { id, storeId } })
  })

  app.delete('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const { count } = await app.prisma.featured.deleteMany({
      where: { id, storeId: request.user.storeId },
    })
    if (count === 0) {
      return reply.status(404).send({ message: 'Destaque não encontrado' })
    }
    return reply.status(204).send()
  })
}
