// Testes das rotas de billing — assinatura atual, assinar/trocar de plano e cancelamento
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken, LOJA_TESTE } from '../../../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

describe('POST /api/billing/subscribe', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('plano PRESENCIAL não pode ser assinado pelo autoatendimento — responde 400', async () => {
    app = await buildTestApp(
      createPrismaFake({
        plan: {
          findUnique: vi.fn(async () => ({
            id: 'plan-presencial',
            active: true,
            priceInCents: 9700,
            salesModality: 'PRESENCIAL',
            setupFeeInCents: 37800,
          })),
        },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/billing/subscribe',
      headers: { authorization: `Bearer ${token}` },
      payload: { planId: 'plan-presencial' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toMatch(/presencial/i)
  })

  it('plano ONLINE gratuito continua funcionando pelo autoatendimento', async () => {
    app = await buildTestApp(
      createPrismaFake({
        plan: {
          findUnique: vi.fn(async () => ({
            id: 'plan-free',
            active: true,
            priceInCents: 0,
            salesModality: 'ONLINE',
            setupFeeInCents: 0,
          })),
        },
        subscription: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(async (args: unknown) => ({ id: 'sub-1', ...(args as { data: Record<string, unknown> }).data })),
        },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/billing/subscribe',
      headers: { authorization: `Bearer ${token}` },
      payload: { planId: 'plan-free' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().subscription.status).toBe('ACTIVE')
  })
})

describe('GET /api/billing/current', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('loja PRESENCIAL aguardando confirmação da implantação fica indisponível mesmo dentro do trial', async () => {
    app = await buildTestApp(
      createPrismaFake({
        subscription: {
          findFirst: vi.fn(async ({ where }: any) => {
            if (where?.status === 'PENDING_SETUP') {
              return { id: 'sub-1', storeId: LOJA_TESTE.id, status: 'PENDING_SETUP', plan: { id: 'plan-presencial' } }
            }
            return null
          }),
        },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'GET',
      url: '/api/billing/current',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().storeAvailable).toBe(false)
  })

  it('loja com assinatura ativa fica disponível', async () => {
    app = await buildTestApp(
      createPrismaFake({
        subscription: {
          findFirst: vi.fn(async ({ where }: any) => {
            if (where?.status === 'ACTIVE') {
              return { id: 'sub-1', storeId: LOJA_TESTE.id, status: 'ACTIVE', plan: { id: 'plan-pago' } }
            }
            return null
          }),
        },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'GET',
      url: '/api/billing/current',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().storeAvailable).toBe(true)
  })
})
