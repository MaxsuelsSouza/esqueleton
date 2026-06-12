// Integração com o MercadoPago — cria planos de assinatura e gerencia recorrência.
// Sem MERCADOPAGO_ACCESS_TOKEN, as operações são logadas mas não executadas (no-op em dev).
import fp from 'fastify-plugin'
import MercadoPagoConfig, { PreApprovalPlan, PreApproval } from 'mercadopago'
import type { FastifyInstance } from 'fastify'

export interface MercadoPagoService {
  /** Cria um plano de recorrência no MercadoPago e retorna o ID */
  createPlan(params: {
    name: string
    amountInCents: number
    billingPeriod: 'MONTHLY' | 'YEARLY'
    backUrl: string
  }): Promise<{ id: string; initPoint: string } | null>

  /** Cria uma assinatura individual vinculada a um plano */
  createSubscription(params: {
    planId: string
    payerEmail: string
    externalReference: string
    backUrl: string
  }): Promise<{ id: string; initPoint: string } | null>

  /** Cancela uma assinatura existente */
  cancelSubscription(subscriptionId: string): Promise<boolean>

  /** Indica se o MercadoPago está configurado */
  isConfigured: boolean
}

declare module 'fastify' {
  interface FastifyInstance {
    mercadopago: MercadoPagoService
  }
}

export const mercadopagoPlugin = fp(async (app: FastifyInstance) => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

  if (!accessToken) {
    app.log.warn('MERCADOPAGO_ACCESS_TOKEN não definido — operações de pagamento desabilitadas')
    app.decorate('mercadopago', {
      isConfigured: false,
      createPlan: async () => null,
      createSubscription: async () => null,
      cancelSubscription: async () => false,
    } satisfies MercadoPagoService)
    return
  }

  const config = new MercadoPagoConfig({ accessToken })
  const planClient = new PreApprovalPlan(config)
  const subscriptionClient = new PreApproval(config)

  const service: MercadoPagoService = {
    isConfigured: true,

    async createPlan({ name, amountInCents, billingPeriod, backUrl }) {
      const response = await planClient.create({
        body: {
          reason: name,
          auto_recurring: {
            frequency: billingPeriod === 'YEARLY' ? 12 : 1,
            frequency_type: 'months',
            transaction_amount: amountInCents / 100,
            currency_id: 'BRL',
          },
          back_url: backUrl,
        },
      })
      return response.id
        ? { id: response.id, initPoint: response.init_point ?? '' }
        : null
    },

    async createSubscription({ planId, payerEmail, externalReference, backUrl }) {
      const response = await subscriptionClient.create({
        body: {
          preapproval_plan_id: planId,
          payer_email: payerEmail,
          external_reference: externalReference,
          back_url: backUrl,
          reason: 'Assinatura Esqueleton',
        },
      })
      return response.id
        ? { id: response.id, initPoint: response.init_point ?? '' }
        : null
    },

    async cancelSubscription(subscriptionId: string) {
      try {
        await subscriptionClient.update({
          id: subscriptionId,
          body: { status: 'cancelled' },
        })
        return true
      } catch (error) {
        app.log.error(error, 'Erro ao cancelar assinatura no MercadoPago')
        return false
      }
    },
  }

  app.decorate('mercadopago', service)
})
