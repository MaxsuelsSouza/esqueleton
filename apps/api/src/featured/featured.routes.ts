import type { FastifyPluginAsync } from 'fastify'
import { featuredSchema } from './featured.schema'

export const featuredRoutes: FastifyPluginAsync = async (app) => {
  // ── Rotas públicas ──────────────────────────────────────────────

  app.get('/', async () => {
    return app.prisma.featured.findMany({ orderBy: { createdAt: 'desc' } })
  })

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const featured = await app.prisma.featured.findUnique({ where: { id } })
    if (!featured) {
      return reply.status(404).send({ message: 'Destaque não encontrado' })
    }
    return featured
  })

  // ── Rotas protegidas (requer JWT) ───────────────────────────────

  app.post(
    '/',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const data = featuredSchema.parse(request.body)

      // Apenas um destaque pode estar ativo por vez — desativa todos antes de ativar o novo
      if (data.active) {
        await app.prisma.featured.updateMany({ data: { active: false } })
      }

      const featured = await app.prisma.featured.create({ data })
      return reply.status(201).send(featured)
    }
  )

  app.put(
    '/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = featuredSchema.partial().parse(request.body)

      // Se este destaque está sendo ativado, desativa todos os outros primeiro
      if (data.active) {
        await app.prisma.featured.updateMany({
          where: { id: { not: id } },
          data: { active: false },
        })
      }

      try {
        const featured = await app.prisma.featured.update({ where: { id }, data })
        return featured
      } catch {
        return reply.status(404).send({ message: 'Destaque não encontrado' })
      }
    }
  )

  app.delete(
    '/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      try {
        await app.prisma.featured.delete({ where: { id } })
        return reply.status(204).send()
      } catch {
        return reply.status(404).send({ message: 'Destaque não encontrado' })
      }
    }
  )
}
