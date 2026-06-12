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

// Situação de um limite para uma loja — usado para decidir se bloqueia a criação
export interface PlanLimitStatus {
  max: number
  current: number
  reached: boolean
}

// Nome amigável de cada limite — usado nas mensagens de erro
const NOMES_DOS_LIMITES: Record<keyof PlanLimits, string> = {
  maxProducts: 'produtos',
  maxUsers: 'usuários',
  maxOrdersPerMonth: 'pedidos neste mês',
}

declare module 'fastify' {
  interface FastifyInstance {
    /** preHandler que bloqueia a rota com 403 quando a loja atingiu o limite do plano */
    checkPlanLimit: (limitKey: keyof PlanLimits) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    /** Consulta a situação de um limite para uma loja — null quando não há limite a aplicar */
    planLimitStatus: (storeId: string, limitKey: keyof PlanLimits) => Promise<PlanLimitStatus | null>
  }
}

export const planLimitsPlugin = fp(async (app: FastifyInstance) => {
  // Consulta a assinatura ativa da loja e compara o limite pedido com o uso atual.
  // Retorna null quando não há o que aplicar (sem assinatura ou limite não definido).
  async function planLimitStatus(storeId: string, limitKey: keyof PlanLimits): Promise<PlanLimitStatus | null> {
    const subscription = await app.prisma.subscription.findFirst({
      where: { storeId, status: 'ACTIVE' },
      include: { plan: true },
    })

    // Sem assinatura ativa = sem limites (não bloqueia — evita trancar lojas em estado inconsistente)
    if (!subscription) return null

    const limits = subscription.plan.limits as PlanLimits
    const max = limits[limitKey]

    // Limite não definido = ilimitado
    if (max === undefined || max === null) return null

    // Conta o uso atual conforme o tipo de limite
    let current = 0

    if (limitKey === 'maxProducts') {
      current = await app.prisma.product.count({ where: { storeId } })
    } else if (limitKey === 'maxUsers') {
      current = await app.prisma.user.count({ where: { storeId } })
    } else if (limitKey === 'maxOrdersPerMonth') {
      // Conta pedidos do mês corrente
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      current = await app.prisma.order.count({
        where: {
          storeId,
          createdAt: { gte: startOfMonth },
        },
      })
    }

    return { max, current, reached: current >= max }
  }

  // Retorna uma função preHandler que verifica o limite pedido.
  // Funciona tanto em rotas do admin (loja vem do token JWT) quanto em rotas
  // públicas (loja vem do slug na URL, resolvido pelo store-context).
  function checkPlanLimit(limitKey: keyof PlanLimits) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const storeId = request.user?.storeId ?? request.store?.id
      if (!storeId) return

      const status = await planLimitStatus(storeId, limitKey)

      if (status?.reached) {
        return reply.status(403).send({
          message: `Limite de ${NOMES_DOS_LIMITES[limitKey]} do plano foi atingido. Faça upgrade para continuar.`,
          limit: status.max,
          current: status.current,
        })
      }
    }
  }

  app.decorate('checkPlanLimit', checkPlanLimit)
  app.decorate('planLimitStatus', planLimitStatus)
})
