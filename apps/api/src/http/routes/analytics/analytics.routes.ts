// Rotas de analytics — divididas em dois grupos:
//   - analyticsPublicRoutes: registro de eventos pelo catálogo, a loja vem do slug na URL
//   - analyticsAdminRoutes: métricas do dashboard, a loja vem do token JWT
import type { FastifyInstance } from 'fastify'
import { createEventSchema } from '../../schemas/analytics.schema'
import {
  computeAnalyticsSummary,
  contarEventosDeHoje,
  LIMITE_DIARIO_DE_EVENTOS_POR_LOJA,
} from '../../../domain/analytics/services/analytics.service'

// A contagem de eventos do dia fica em cache por 60 segundos — evita uma
// consulta extra ao banco em cada evento registrado (mesmo padrão do cache
// de slugs em store-context.plugin.ts)
const CACHE_TTL_MS = 60_000
// Limite de lojas no cache — evita crescimento sem fim na memória
const CACHE_MAX_ENTRIES = 1000

// ── Rota pública — a loja vem do slug na URL ───────────────────────
export async function analyticsPublicRoutes(app: FastifyInstance) {
  const contagemDeHojePorLoja = new Map<string, { contagem: number; expiraEm: number }>()

  // POST /api/lojas/:slug/analytics/events — público, sem autenticação
  // Chamado pelo frontend sempre que um produto é visualizado, favoritado, adicionado à sacola ou enviado pelo WhatsApp
  // Duas proteções contra eventos falsos em massa:
  //   1. Limite por IP (abaixo) — segura um bot vindo de um endereço só
  //   2. Teto diário por loja — segura ataque distribuído (muitos IPs, poucos
  //      eventos cada), que passaria pelo limite por IP e incharia o banco
  app.post('/events', { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } }, async (request, reply) => {
    const data = createEventSchema.parse(request.body)
    const storeId = request.store!.id

    // Descobre quantos eventos a loja já tem hoje — do cache ou do banco
    const agora = Date.now()
    let contador = contagemDeHojePorLoja.get(storeId)
    if (!contador || contador.expiraEm <= agora) {
      const contagem = await contarEventosDeHoje(app.prisma, storeId)
      if (contagemDeHojePorLoja.size >= CACHE_MAX_ENTRIES) {
        // Remove a entrada mais antiga para abrir espaço
        const maisAntiga = contagemDeHojePorLoja.keys().next().value
        if (maisAntiga !== undefined) contagemDeHojePorLoja.delete(maisAntiga)
      }
      contador = { contagem, expiraEm: agora + CACHE_TTL_MS }
      contagemDeHojePorLoja.set(storeId, contador)
    }

    // No teto: responde sucesso normalmente mas descarta o evento — o atacante
    // não descobre que foi bloqueado, e o frontend (que dispara e esquece)
    // continua funcionando. As métricas do dia ficam congeladas no teto.
    if (contador.contagem >= LIMITE_DIARIO_DE_EVENTOS_POR_LOJA) {
      return reply.status(201).send({ message: 'Evento registrado.' })
    }

    contador.contagem += 1
    await app.prisma.productEvent.create({ data: { ...data, storeId } })
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
