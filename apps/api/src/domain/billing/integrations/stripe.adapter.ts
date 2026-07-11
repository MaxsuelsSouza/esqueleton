// Integração com o Stripe — cria produtos/preços de assinatura e gerencia recorrência.
// Sem STRIPE_SECRET_KEY, as operações são logadas mas não executadas (no-op em dev).
// O SDK do Stripe é carregado sob demanda (só quando configurado) para não pesar
// o boot/testes que rodam sem credencial — mesmo padrão do lazy-load do ioredis.
import fp from 'fastify-plugin'
import type Stripe from 'stripe'
import type { FastifyInstance } from 'fastify'

// Fatura simplificada — só o que o painel precisa mostrar (nunca o objeto cru do Stripe)
export interface StripeInvoice {
  id: string
  // Data de emissão (unix em segundos)
  createdAt: number
  // Valor total em centavos
  amountInCents: number
  currency: string
  // Status do Stripe: paid, open, void, uncollectible, draft
  status: string
  // Página hospedada da fatura no Stripe (o botão "Ver" abre isto)
  hostedInvoiceUrl: string | null
}

export interface StripeService {
  /** Cria um Product + Price recorrente no Stripe e retorna os IDs */
  createProductWithPrice(params: {
    name: string
    amountInCents: number
    billingPeriod: 'MONTHLY' | 'YEARLY'
  }): Promise<{ productId: string; priceId: string } | null>

  /**
   * Cria uma sessão de checkout (modo assinatura). Reaproveita o Customer da loja
   * se já existir (customerId); caso contrário, o Stripe cria um novo a partir do e-mail.
   * O cartão é coletado agora, mas o primeiro débito só ocorre em `trialEnd`
   * (unix em segundos) — a âncora de cobrança do dia 10.
   */
  createCheckoutSession(params: {
    priceId: string
    // ID da nossa Subscription — vai no client_reference_id para o webhook localizar
    referenceId: string
    customerId?: string | null
    customerEmail: string
    // Unix (segundos) do primeiro débito — mantém a cobrança sempre no dia 10
    trialEnd: number
    successUrl: string
    cancelUrl: string
  }): Promise<{ id: string; url: string } | null>

  /** Cancela uma assinatura recorrente existente */
  cancelSubscription(stripeSubscriptionId: string): Promise<boolean>

  /** Consulta o status atual de uma assinatura no Stripe (para reconciliação) */
  getSubscriptionStatus(stripeSubscriptionId: string): Promise<string | null>

  /** Lista as faturas de um Customer, com paginação por cursor (startingAfter) */
  listInvoices(params: {
    customerId: string
    limit: number
    startingAfter?: string
  }): Promise<{ data: StripeInvoice[]; hasMore: boolean }>

  /**
   * Valida a assinatura do webhook e retorna o evento. Lança se a assinatura for
   * inválida. Retorna null se o webhook não estiver configurado (dev sem secret).
   */
  constructWebhookEvent(rawBody: Buffer | string, signature: string): Stripe.Event | null

  /** Indica se o Stripe está configurado (chave secreta presente) */
  isConfigured: boolean

  /** Indica se a validação de webhook está configurada (secret presente) */
  webhookConfigured: boolean
}

declare module 'fastify' {
  interface FastifyInstance {
    stripe: StripeService
  }
}

export const stripePlugin = fp(async (app: FastifyInstance) => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secretKey) {
    app.log.warn('STRIPE_SECRET_KEY não definido — operações de pagamento desabilitadas')
    app.decorate('stripe', {
      isConfigured: false,
      webhookConfigured: false,
      createProductWithPrice: async () => null,
      createCheckoutSession: async () => null,
      cancelSubscription: async () => false,
      getSubscriptionStatus: async () => null,
      listInvoices: async () => ({ data: [], hasMore: false }),
      constructWebhookEvent: () => null,
    } satisfies StripeService)
    return
  }

  // Fail-closed: em produção, ter a chave de pagamento sem o secret do webhook
  // deixaria a rota do webhook aceitar eventos não assinados — alguém poderia
  // forjar um "pagamento aprovado" e ativar assinatura de graça. Recusa o boot.
  if (!webhookSecret && process.env.NODE_ENV === 'production') {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET é obrigatório em produção quando STRIPE_SECRET_KEY está definido.',
    )
  }

  // Import dinâmico: o módulo (grande) só é carregado quando há credencial
  const StripeSdk = (await import('stripe')).default
  // Sem apiVersion explícita: o SDK usa a versão fixada por ele, evitando
  // divergência entre a conta e a tipagem da biblioteca.
  const stripe = new StripeSdk(secretKey)

  const service: StripeService = {
    isConfigured: true,
    webhookConfigured: Boolean(webhookSecret),

    async createProductWithPrice({ name, amountInCents, billingPeriod }) {
      const product = await stripe.products.create({ name })
      const price = await stripe.prices.create({
        product: product.id,
        currency: 'brl',
        unit_amount: amountInCents,
        recurring: { interval: billingPeriod === 'YEARLY' ? 'year' : 'month' },
      })
      return { productId: product.id, priceId: price.id }
    },

    async createCheckoutSession({ priceId, referenceId, customerId, customerEmail, trialEnd, successUrl, cancelUrl }) {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        // client_reference_id liga a sessão à nossa Subscription no webhook
        client_reference_id: referenceId,
        // Reaproveita o Customer da loja quando já existe; senão, cria a partir do e-mail
        ...(customerId ? { customer: customerId } : { customer_email: customerEmail }),
        // Coleta o cartão agora, mas só debita em trial_end (âncora do dia 10).
        // payment_method_collection 'always' garante que o cartão seja capturado
        // mesmo havendo período sem cobrança até o primeiro débito.
        payment_method_collection: 'always',
        subscription_data: {
          trial_end: trialEnd,
          metadata: { subscriptionDbId: referenceId },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      })
      return session.url ? { id: session.id, url: session.url } : null
    },

    async cancelSubscription(stripeSubscriptionId: string) {
      try {
        await stripe.subscriptions.cancel(stripeSubscriptionId)
        return true
      } catch (error) {
        app.log.error(error, 'Erro ao cancelar assinatura no Stripe')
        return false
      }
    },

    async getSubscriptionStatus(stripeSubscriptionId: string) {
      try {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
        return subscription.status
      } catch (error) {
        app.log.error(error, 'Erro ao consultar assinatura no Stripe')
        return null
      }
    },

    async listInvoices({ customerId, limit, startingAfter }) {
      const lista = await stripe.invoices.list({
        customer: customerId,
        limit,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      })
      return {
        data: lista.data.map((invoice) => ({
          id: invoice.id ?? '',
          createdAt: invoice.created,
          amountInCents: invoice.total,
          currency: invoice.currency,
          status: invoice.status ?? 'draft',
          hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
        })),
        hasMore: lista.has_more,
      }
    },

    constructWebhookEvent(rawBody, signature) {
      if (!webhookSecret) return null
      // Lança StripeSignatureVerificationError se a assinatura não bater — a rota trata
      return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    },
  }

  app.decorate('stripe', service)
})
