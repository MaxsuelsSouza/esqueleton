// Verifica se a loja atingiu o limite do plano antes de criar recursos.
// Busca a assinatura ativa → plano → limites, e compara com o uso atual.
import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

// Limites possíveis definidos no JSON do plano
interface PlanLimits {
  maxProducts?: number
  maxUsers?: number
  maxOrdersPerMonth?: number
}

declare module 'fastify' {
  interface FastifyInstance {
    /** Verifica se a loja do usuário logado pode criar mais um recurso deste tipo */
    checkPlanLimit: (limitKey: keyof PlanLimits) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export const planLimitsPlugin = fp(async (app: FastifyInstance) => {
  // Retorna uma função preHandler que verifica o limite pedido
  function checkPlanLimit(limitKey: keyof PlanLimits) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const storeId = request.user.storeId

      // Busca a assinatura ativa da loja
      const subscription = await app.prisma.subscription.findFirst({
        where: { storeId, status: 'ACTIVE' },
        include: { plan: true },
      })

      // Sem assinatura ativa = sem limites (não bloqueia — evita trancar lojas em estado inconsistente)
      if (!subscription) return

      const limits = subscription.plan.limits as PlanLimits
      const max = limits[limitKey]

      // Limite não definido = ilimitado
      if (max === undefined || max === null) return

      // Conta o uso atual conforme o tipo de limite
      let currentUsage = 0

      if (limitKey === 'maxProducts') {
        currentUsage = await app.prisma.product.count({ where: { storeId } })
      } else if (limitKey === 'maxUsers') {
        currentUsage = await app.prisma.user.count({ where: { storeId } })
      } else if (limitKey === 'maxOrdersPerMonth') {
        // Conta pedidos do mês corrente
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        currentUsage = await app.prisma.order.count({
          where: {
            storeId,
            createdAt: { gte: startOfMonth },
          },
        })
      }

      if (currentUsage >= max) {
        return reply.status(403).send({
          message: `Limite do plano atingido (${limitKey}). Faça upgrade para continuar.`,
          limit: max,
          current: currentUsage,
        })
      }
    }
  }

  app.decorate('checkPlanLimit', checkPlanLimit)
})
