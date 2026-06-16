// Rotas de analytics — divididas em dois grupos:
//   - analyticsPublicRoutes: registro de eventos pelo catálogo, a loja vem do slug na URL
//   - analyticsAdminRoutes: métricas do dashboard, a loja vem do token JWT
import type { FastifyInstance } from 'fastify'
import { createEventSchema } from '../../schemas/analytics.schema'
import { computeAnalyticsSummary } from '../../../domain/analytics/services/analytics.service'

// ── Rota pública — a loja vem do slug na URL ───────────────────────
export async function analyticsPublicRoutes(app: FastifyInstance) {

  // POST /api/lojas/:slug/analytics/events — público, sem autenticação
  // Chamado pelo frontend sempre que um produto é visualizado, favoritado, adicionado à sacola ou enviado pelo WhatsApp
  // Limite por IP — impede que alguém infle as métricas com eventos falsos em massa
  app.post('/events', { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } }, async (request, reply) => {
    const data = createEventSchema.parse(request.body)
    await app.prisma.productEvent.create({ data: { ...data, storeId: request.store!.id } })
    return reply.status(201).send({ message: 'Evento registrado.' })
  })
}

// ── Rotas do admin — a loja vem do token JWT ───────────────────────
export async function analyticsAdminRoutes(app: FastifyInstance) {
  // Todas as rotas deste grupo exigem login
  app.addHook('preHandler', app.authenticate)

  // DELETE /api/analytics/events — remove todos os eventos da loja, zerando o funil
  app.delete('/events', async (request, reply) => {
    await app.prisma.productEvent.deleteMany({ where: { storeId: request.user.storeId } })
    return reply.send({ message: 'Registros do funil apagados.' })
  })

  // GET /api/analytics/summary — agrega os eventos da loja e calcula as métricas completas do dashboard
  app.get('/summary', async (request, reply) => {
    const summary = await computeAnalyticsSummary(app.prisma, request.user.storeId)
    return reply.send(summary)
  })
}
