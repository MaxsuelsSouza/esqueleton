// Job de retenção de dados (LGPD, arts. 15-16) — chamado pelo agendador
// (Vercel Cron) uma vez por dia. Apaga tokens usados/expirados, notificações
// antigas, anonimiza pedidos antigos, expurga eventos de analytics e cuida
// do ciclo de lojas inativas (aviso por e-mail → exclusão em 30 dias).
//
// Segurança: o agendador se identifica com "Authorization: Bearer <CRON_SECRET>"
// (padrão do Vercel Cron). Sem CRON_SECRET configurado, a rota fica desativada
// em produção (ninguém consegue disparar a limpeza por engano ou abuso);
// em dev/test ela roda aberta para facilitar testes manuais.
import type { FastifyPluginAsync } from 'fastify'
import { executarLimpezaDeRetencao } from '../../../domain/privacy/services/data-retention.service'
import { processarLojasInativas } from '../../../domain/privacy/services/inactive-stores.service'
import { storeDeletionWarningEmail } from '../../../shared/email/templates'
import { buildStorePrefix } from '../../../shared/storage/r2-key'

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
      const retencao = await executarLimpezaDeRetencao(app.prismaRaw)

      // Ciclo de lojas inativas: aviso ao dono e exclusão após 30 dias
      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
      const lojasInativas = await processarLojasInativas(app.prismaRaw, {
        enviarAvisoDeExclusao: (emailDoDono, nomeDaLoja) =>
          app.email.send(
            emailDoDono,
            `Sua loja ${nomeDaLoja} será excluída em 30 dias`,
            storeDeletionWarningEmail(nomeDaLoja, `${frontendUrl}/admin/login`),
          ),
        cancelarAssinatura: async (preapprovalId) => {
          const cancelou = await app.mercadopago.cancelSubscription(preapprovalId)
          if (!cancelou) {
            app.log.error({ preapprovalId }, 'Falha ao cancelar assinatura na exclusão de loja inativa')
          }
          return cancelou
        },
        // Fire-and-forget: falha no storage não pode impedir a exclusão da loja
        apagarImagensDaLoja: (storeId) => {
          app.storage?.deleteByPrefix(buildStorePrefix(storeId)).catch((error) => {
            app.log.error({ error, storeId }, 'Falha ao limpar imagens do R2 na exclusão de loja inativa')
          })
        },
      })

      const resultado = { ...retencao, ...lojasInativas }

      // Registra as contagens para acompanhamento (auditoria simples via logs)
      app.log.info({ resultado }, 'Limpeza de retenção LGPD executada')
      return reply.send({ message: 'Limpeza executada', resultado })
    },
  )
}
