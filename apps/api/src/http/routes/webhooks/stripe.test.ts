// Testes do webhook do Stripe — verificação de assinatura e transições de status
import { describe, it, expect, afterEach, vi } from 'vitest'
import Fastify from 'fastify'
import Stripe from 'stripe'
import { createPrismaFake, buildTestApp, LOJA_TESTE } from '../../../test/test-helpers'
import { webhookRoutes } from './stripe.routes'
import { stripePlugin } from '../../../domain/billing/integrations/stripe.adapter'
import type { StripeService } from '../../../domain/billing/integrations/stripe.adapter'

// Stripe no-op para testar a rota isoladamente (sem os guards de produção dos demais plugins)
const STRIPE_NOOP: StripeService = {
  isConfigured: false,
  webhookConfigured: false,
  createProductWithPrice: async () => null,
  createCheckoutSession: async () => null,
  cancelSubscription: async () => false,
  getSubscriptionStatus: async () => null,
  listInvoices: async () => ({ data: [], hasMore: false }),
  constructWebhookEvent: () => null,
}

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

const ASSINATURA = {
  id: 'sub1',
  storeId: LOJA_TESTE.id,
  planId: 'plan-pago',
  status: 'PENDING',
  stripeSubscriptionId: 'sub_stripe_123',
}

// Monta um evento do Stripe no formato { type, data: { object } }
function evento(type: string, object: Record<string, unknown>) {
  return { id: 'evt_1', type, data: { object } }
}

function bancoComAssinatura(extras: Record<string, Record<string, (...args: unknown[]) => unknown>> = {}) {
  return createPrismaFake({
    subscription: {
      findFirst: vi.fn(async () => ASSINATURA),
      updateMany: vi.fn(async () => ({ count: 1 })),
      create: vi.fn(async () => ({})),
    },
    store: { update: vi.fn(async () => ({})) },
    notification: { upsert: vi.fn(async () => ({})) },
    ...extras,
  })
}

describe('POST /api/webhooks/stripe', () => {
  let app: TestApp
  const NODE_ENV_ORIGINAL = process.env.NODE_ENV

  afterEach(async () => {
    await app?.close()
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
    process.env.NODE_ENV = NODE_ENV_ORIGINAL
  })

  // ── Sem secret configurado (dev): o body JSON é aceito direto ──

  it('checkout pago (cartão) ativa a assinatura e salva a assinatura/cliente do Stripe', async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }))
    const storeUpdate = vi.fn(async () => ({}))
    app = await buildTestApp(
      bancoComAssinatura({
        subscription: { findFirst: vi.fn(async () => ASSINATURA), updateMany, create: vi.fn(async () => ({})) },
        store: { update: storeUpdate },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      payload: evento('checkout.session.completed', {
        client_reference_id: ASSINATURA.id,
        subscription: 'sub_stripe_novo',
        customer: 'cus_123',
        payment_status: 'paid',
      }),
    })

    expect(response.statusCode).toBe(200)
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ASSINATURA.id, storeId: ASSINATURA.storeId },
        data: expect.objectContaining({ status: 'ACTIVE', stripeSubscriptionId: 'sub_stripe_novo' }),
      })
    )
    // O Customer do Stripe é salvo na loja para reaproveitar em trocas de plano
    expect(storeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ASSINATURA.storeId }, data: { stripeCustomerId: 'cus_123' } })
    )
  })

  it('checkout não pago (boleto/Pix) NÃO ativa — vincula o ID mas mantém PENDING', async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }))
    app = await buildTestApp(
      bancoComAssinatura({
        subscription: { findFirst: vi.fn(async () => ASSINATURA), updateMany, create: vi.fn(async () => ({})) },
        store: { update: vi.fn(async () => ({})) },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      payload: evento('checkout.session.completed', {
        client_reference_id: ASSINATURA.id,
        subscription: 'sub_stripe_novo',
        customer: 'cus_123',
        payment_status: 'unpaid',
      }),
    })

    expect(response.statusCode).toBe(200)
    // Vincula o ID do Stripe (para o evento seguinte localizar), mas NÃO ativa
    const args = updateMany.mock.calls[0] as unknown as unknown[]
    const chamada = args[0] as { data: Record<string, unknown> }
    expect(chamada.data).toHaveProperty('stripeSubscriptionId', 'sub_stripe_novo')
    expect(chamada.data).not.toHaveProperty('status')
    expect(chamada.data).not.toHaveProperty('currentPeriodStart')
  })

  it('checkout em trial (no_payment_required) ativa — âncora do dia 10 sem débito agora', async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }))
    app = await buildTestApp(
      bancoComAssinatura({
        subscription: { findFirst: vi.fn(async () => ASSINATURA), updateMany, create: vi.fn(async () => ({})) },
        store: { update: vi.fn(async () => ({})) },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      payload: evento('checkout.session.completed', {
        client_reference_id: ASSINATURA.id,
        subscription: 'sub_stripe_novo',
        customer: 'cus_123',
        payment_status: 'no_payment_required',
      }),
    })

    expect(response.statusCode).toBe(200)
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE', stripeSubscriptionId: 'sub_stripe_novo' }) })
    )
  })

  it('assinatura com pagamento em atraso pausa e gera notificação', async () => {
    const notificationUpsert = vi.fn(async () => ({}))
    app = await buildTestApp(bancoComAssinatura({ notification: { upsert: notificationUpsert } }))

    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      payload: evento('customer.subscription.updated', { id: ASSINATURA.stripeSubscriptionId, status: 'past_due' }),
    })

    expect(response.statusCode).toBe(200)
    expect(notificationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ type: 'SUBSCRIPTION_PAYMENT_FAILED' }) })
    )
  })

  it('falha de pagamento (invoice.payment_failed) pausa e envia e-mail ao lojista', async () => {
    app = await buildTestApp(
      bancoComAssinatura({
        subscription: { findFirst: vi.fn(async () => ASSINATURA), updateMany: vi.fn(async () => ({ count: 1 })), create: vi.fn(async () => ({})) },
        // O aviso por e-mail busca o dono e o nome da loja
        user: { findFirst: vi.fn(async () => ({ email: 'dono@loja.com' })) },
        store: { findUnique: vi.fn(async () => ({ name: 'Loja Teste' })), update: vi.fn(async () => ({})) },
        notification: { upsert: vi.fn(async () => ({})) },
      })
    )
    const sendSpy = vi.spyOn(app.email, 'send')

    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      payload: evento('invoice.payment_failed', { subscription: ASSINATURA.stripeSubscriptionId }),
    })

    expect(response.statusCode).toBe(200)
    // E-mail é fire-and-forget — aguarda o disparo assíncrono
    await vi.waitFor(() => expect(sendSpy).toHaveBeenCalled())
    expect(sendSpy).toHaveBeenCalledWith(
      'dono@loja.com',
      expect.stringContaining('Pagamento não efetuado'),
      expect.stringContaining('desativada'),
    )
  })

  it('assinatura removida no Stripe marca cancelada e avisa (sem voltar a plano gratuito)', async () => {
    const subscriptionCreate = vi.fn(async () => ({}))
    const updateMany = vi.fn(async () => ({ count: 1 }))
    const notificationUpsert = vi.fn(async () => ({}))
    app = await buildTestApp(
      bancoComAssinatura({
        subscription: { findFirst: vi.fn(async () => ASSINATURA), updateMany, create: subscriptionCreate },
        notification: { upsert: notificationUpsert },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      payload: evento('customer.subscription.deleted', { id: ASSINATURA.stripeSubscriptionId }),
    })

    expect(response.statusCode).toBe(200)
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) })
    )
    // Modelo "pagou, usou": nenhuma assinatura gratuita é criada no lugar
    expect(subscriptionCreate).not.toHaveBeenCalled()
    expect(notificationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ type: 'SUBSCRIPTION_CANCELLED' }) })
    )
  })

  it('assinatura desconhecida responde 200 sem alterar nada', async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }))
    app = await buildTestApp(
      bancoComAssinatura({
        subscription: { findFirst: vi.fn(async () => null), updateMany, create: vi.fn(async () => ({})) },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      payload: evento('customer.subscription.updated', { id: 'sub_inexistente', status: 'active' }),
    })

    // 200 para o Stripe não reenviar — mas nada é alterado
    expect(response.statusCode).toBe(200)
    expect(updateMany).not.toHaveBeenCalled()
  })

  // ── Com secret configurado: a assinatura do Stripe é validada ──

  it('com o secret configurado, assinatura inválida responde 401', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_teste'
    app = await buildTestApp(bancoComAssinatura())

    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': 't=123,v1=hash-falso', 'content-type': 'application/json' },
      payload: JSON.stringify(evento('customer.subscription.deleted', { id: ASSINATURA.stripeSubscriptionId })),
    })

    expect(response.statusCode).toBe(401)
  })

  it('com o secret configurado, assinatura válida é aceita e processada', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_teste'
    const updateMany = vi.fn(async () => ({ count: 1 }))
    app = await buildTestApp(
      bancoComAssinatura({
        subscription: { findFirst: vi.fn(async () => ASSINATURA), updateMany, create: vi.fn(async () => ({})) },
        notification: { upsert: vi.fn(async () => ({})) },
      })
    )

    // Gera a assinatura exatamente como o Stripe (HMAC local, sem rede)
    const payload = JSON.stringify(evento('customer.subscription.deleted', { id: ASSINATURA.stripeSubscriptionId }))
    const stripe = new Stripe('sk_test_dummy')
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_teste' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': signature, 'content-type': 'application/json' },
      payload,
    })

    expect(response.statusCode).toBe(200)
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) })
    )
  })

  // ── Fail-closed em produção (plugin/rota isolados dos demais guards) ──

  it('em produção, o plugin recusa o boot com chave de pagamento e sem webhook secret', async () => {
    process.env.NODE_ENV = 'production'
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
    // sem STRIPE_WEBHOOK_SECRET de propósito

    app = Fastify()
    app.register(stripePlugin)
    await expect(app.ready()).rejects.toThrow(/STRIPE_WEBHOOK_SECRET/)
  })

  it('em produção, a rota recusa (500) um evento sem verificação de assinatura', async () => {
    process.env.NODE_ENV = 'production'
    const updateMany = vi.fn(async () => ({ count: 1 }))
    const fake = bancoComAssinatura({
      subscription: { findFirst: vi.fn(async () => ASSINATURA), updateMany, create: vi.fn(async () => ({})) },
    })

    // Monta um app mínimo: só os decorators que a rota usa + Stripe no-op (webhookConfigured=false)
    app = Fastify()
    app.decorate('prisma', fake)
    app.decorate('prismaRaw', fake)
    app.decorate('stripe', STRIPE_NOOP)
    app.register(webhookRoutes, { prefix: '/api/webhooks' })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      payload: evento('customer.subscription.deleted', { id: ASSINATURA.stripeSubscriptionId }),
    })

    expect(response.statusCode).toBe(500)
    expect(updateMany).not.toHaveBeenCalled()
  })
})
