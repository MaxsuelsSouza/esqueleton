// Job de retenção de dados (LGPD, arts. 15-16) — chamado pelo agendador
// (Vercel Cron) uma vez por dia. Apaga tokens usados/expirados, notificações
// antigas, anonimiza pedidos antigos e expurga eventos de analytics.
//
// Segurança: o agendador se identifica com "Authorization: Bearer <CRON_SECRET>"
// (padrão do Vercel Cron). Sem CRON_SECRET configurado, a rota fica desativada
// em produção (ninguém consegue disparar a limpeza por engano ou abuso);
// em dev/test ela roda aberta para facilitar testes manuais.
import type { FastifyPluginAsync } from 'fastify'
import { executarLimpezaDeRetencao } from '../../../domain/privacy/services/data-retention.service'

export const dataRetentionJobRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/jobs/limpeza-lgpd — o Vercel Cron dispara requisições GET
  app.get(
    '/limpeza-lgpd',
    // Limite apertado: é um job diário, não uma rota de uso repetido
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const cronSecret = process.env.CRON_SECRET

      if (cronSecret) {
        // O agendador envia o segredo no cabeçalho Authorization
        if (request.headers.authorization !== `Bearer ${cronSecret}`) {
          return reply.status(401).send({ message: 'Não autorizado' })
        }
      } else if (process.env.NODE_ENV === 'production') {
        // Produção sem segredo configurado: rota desativada por segurança
        app.log.error('CRON_SECRET não configurado — job de limpeza LGPD desativado')
        return reply.status(503).send({ message: 'Job não configurado' })
      }

      // prismaRaw (sem tenant guard): a limpeza varre todas as lojas de uma
      // vez, como as rotas super-admin — exceção documentada no plugin do Prisma
      const resultado = await executarLimpezaDeRetencao(app.prismaRaw)

      // Registra as contagens para acompanhamento (auditoria simples via logs)
      app.log.info({ resultado }, 'Limpeza de retenção LGPD executada')
      return reply.send({ message: 'Limpeza executada', resultado })
    },
  )
}
