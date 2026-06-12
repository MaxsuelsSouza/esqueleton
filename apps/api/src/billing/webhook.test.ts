// Testes do webhook do MercadoPago — assinatura HMAC e transições de status
import { describe, it, expect, afterEach, vi } from 'vitest'
import crypto from 'crypto'
import { createPrismaFake, buildTestApp, LOJA_TESTE } from '../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

const ASSINATURA = {
  id: 'sub1',
  storeId: LOJA_TESTE.id,
  planId: 'plan-pago',
  status: 'PENDING',
  mercadoPagoPreapprovalId: 'mp-123',
}

// Corpo padrão de notificação de assinatura do MercadoPago
function eventoDeAssinatura(status: string) {
  return {
    type: 'subscription_preapproval',
    action: 'updated',
    data: { id: 'mp-123', status },
  }
}

function bancoComAssinatura(extras: Record<string, Record<string, (...args: unknown[]) => unknown>> = {}) {
  return createPrismaFake({
    subscription: {
      findFirst: vi.fn(async () => ASSINATURA),
      updateMany: vi.fn(async () => ({ count: 1 })),
      create: vi.fn(async () => ({})),
    },
    notification: { upsert: vi.fn(async () => ({})) },
    ...extras,
  })
}

describe('POST /api/webhooks/mercadopago', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET
  })

  it('pagamento autorizado ativa a assinatura', async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }))
    app = await buildTestApp(
      bancoComAssinatura({
        subscription: {
          findFirst: vi.fn(async () => ASSINATURA),
          updateMany,
          create: vi.fn(async () => ({})),
        },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/mercadopago',
      payload: eventoDeAssinatura('authorized'),
    })

    expect(response.statusCode).toBe(200)
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ASSINATURA.id, storeId: ASSINATURA.storeId },
        data: expect.objectContaining({ status: 'ACTIVE' }),
      })
    )
  })

  it('pagamento pausado gera notificação de falha de pagamento', async () => {
    const notificationUpsert = vi.fn(async () => ({}))
    app = await buildTestApp(
      bancoComAssinatura({ notification: { upsert: notificationUpsert } })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/mercadopago',
      payload: eventoDeAssinatura('paused'),
    })

    expect(response.statusCode).toBe(200)
    expect(notificationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ type: 'SUBSCRIPTION_PAYMENT_FAILED' }),
      })
    )
  })

  it('cancelamento volta a loja ao plano gratuito e avisa o lojista', async () => {
    const subscriptionCreate = vi.fn(async () => ({}))
    const notificationUpsert = vi.fn(async () => ({}))
    app = await buildTestApp(
      bancoComAssinatura({
        subscription: {
          findFirst: vi.fn(async () => ASSINATURA),
          updateMany: vi.fn(async () => ({ count: 1 })),
          create: subscriptionCreate,
        },
        plan: { findFirst: vi.fn(async () => ({ id: 'plan-free', priceInCents: 0 })) },
        notification: { upsert: notificationUpsert },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/mercadopago',
      payload: eventoDeAssinatura('cancelled'),
    })

    expect(response.statusCode).toBe(200)
    // Nova assinatura gratuita já ativa, na mesma loja
    expect(subscriptionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ storeId: LOJA_TESTE.id, planId: 'plan-free', status: 'ACTIVE' }),
      })
    )
    expect(notificationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ type: 'SUBSCRIPTION_CANCELLED' }),
      })
    )
  })

  it('evento de assinatura desconhecida responde 200 sem alterar nada', async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }))
    app = await buildTestApp(
      bancoComAssinatura({
        subscription: {
          findFirst: vi.fn(async () => null),
          updateMany,
          create: vi.fn(async () => ({})),
        },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/mercadopago',
      payload: eventoDeAssinatura('authorized'),
    })

    // 200 para o MercadoPago não reenviar — mas nada é alterado
    expect(response.statusCode).toBe(200)
    expect(updateMany).not.toHaveBeenCalled()
  })

  it('com o secret configurado, assinatura HMAC inválida responde 401', async () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = 'segredo-teste'
    app = await buildTestApp(bancoComAssinatura())

    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/mercadopago',
      headers: { 'x-signature': 'ts=123,v1=hash-falso', 'x-request-id': 'req-1' },
      payload: eventoDeAssinatura('authorized'),
    })

    expect(response.statusCode).toBe(401)
  })

  it('com o secret configurado, assinatura HMAC válida é aceita', async () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = 'segredo-teste'
    const updateMany = vi.fn(async () => ({ count: 1 }))
    app = await buildTestApp(
      bancoComAssinatura({
        subscription: {
          findFirst: vi.fn(async () => ASSINATURA),
          updateMany,
          create: vi.fn(async () => ({})),
        },
      })
    )

    // Monta a assinatura exatamente como o MercadoPago: HMAC do template
    // "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
    const ts = '1700000000'
    const requestId = 'req-1'
    const manifest = `id:mp-123;request-id:${requestId};ts:${ts};`
    const v1 = crypto.createHmac('sha256', 'segredo-teste').update(manifest).digest('hex')

    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/mercadopago',
      headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId },
      payload: eventoDeAssinatura('authorized'),
    })

    expect(response.statusCode).toBe(200)
    expect(updateMany).toHaveBeenCalled()
  })
})
