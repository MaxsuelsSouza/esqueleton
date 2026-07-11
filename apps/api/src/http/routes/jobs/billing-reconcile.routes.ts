// Job de reconciliação de assinaturas — chamado pelo agendador (Vercel Cron)
// todo dia 10, quando acontece a cobrança recorrente. Verifica no Stripe o
// status real de cada assinatura vinculada e corrige o nosso banco. É uma rede
// de segurança: se um webhook se perdeu, o status ainda fica correto aqui.
//
// Quando a assinatura deixa de estar ACTIVE, a loja fica indisponível para o
// público automaticamente (regra "pagou, usou" em store-availability.service).
//
// Segurança: mesmo padrão do job de limpeza LGPD — o agendador se identifica com
// "Authorization: Bearer <CRON_SECRET>". Sem CRON_SECRET a rota fica desativada
// em produção; em dev/test roda aberta para facilitar testes manuais.
import type { FastifyPluginAsync } from 'fastify'

// Mapeia o status do Stripe para o nosso (mesma tabela do webhook)
function mapStripeStatus(stripeStatus: string): string | null {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') return 'ACTIVE'
  if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') return 'PAUSED'
  if (stripeStatus === 'canceled' || stripeStatus === 'incomplete_expired') return 'CANCELLED'
  if (stripeStatus === 'incomplete') return 'PENDING'
  return null
}

export const billingReconcileJobRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/jobs/verificar-assinaturas — o Vercel Cron dispara requisições GET
  app.get(
    '/verificar-assinaturas',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const cronSecret = process.env.CRON_SECRET

      if (cronSecret) {
        if (request.headers.authorization !== `Bearer ${cronSecret}`) {
          return reply.status(401).send({ message: 'Não autorizado' })
        }
      } else if (process.env.NODE_ENV === 'production') {
        app.log.error('CRON_SECRET não configurado — job de reconciliação desativado')
        return reply.status(503).send({ message: 'Job não configurado' })
      }

      // Sem Stripe configurado não há o que reconciliar
      if (!app.stripe.isConfigured) {
        return reply.send({ message: 'Stripe não configurado', verificadas: 0, corrigidas: 0 })
      }

      // Só assinaturas que já têm vínculo no Stripe e que podem mudar de estado.
      // prismaRaw (sem tenant guard): a varredura atravessa todas as lojas.
      const assinaturas = await app.prismaRaw.subscription.findMany({
        where: {
          stripeSubscriptionId: { not: null },
          status: { in: ['ACTIVE', 'PENDING', 'PAUSED'] },
        },
        select: { id: true, storeId: true, status: true, stripeSubscriptionId: true },
      })

      let corrigidas = 0
      for (const assinatura of assinaturas) {
        const stripeStatus = await app.stripe.getSubscriptionStatus(assinatura.stripeSubscriptionId!)
        if (!stripeStatus) continue

        const novoStatus = mapStripeStatus(stripeStatus)
        if (novoStatus && novoStatus !== assinatura.status) {
          await app.prisma.subscription.updateMany({
            where: { id: assinatura.id, storeId: assinatura.storeId },
            data: {
              status: novoStatus,
              ...(novoStatus === 'ACTIVE' ? { currentPeriodStart: new Date() } : {}),
            },
          })
          corrigidas++
          app.log.info(
            { subscriptionId: assinatura.id, de: assinatura.status, para: novoStatus },
            'Reconciliação: status da assinatura corrigido',
          )
        }
      }

      const resultado = { verificadas: assinaturas.length, corrigidas }
      app.log.info({ resultado }, 'Reconciliação de assinaturas executada')
      return reply.send({ message: 'Reconciliação executada', resultado })
    },
  )
}
