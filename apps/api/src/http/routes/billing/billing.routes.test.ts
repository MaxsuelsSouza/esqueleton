// Testes do histórico de faturas — GET /api/billing/invoices
// Só exibe o que vem do Stripe; sem Customer, lista vazia.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken } from '../../../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

describe('GET /api/billing/invoices', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('exige autenticação', async () => {
    app = await buildTestApp(createPrismaFake({}))
    const response = await app.inject({ method: 'GET', url: '/api/billing/invoices' })
    expect(response.statusCode).toBe(401)
  })

  it('loja sem Customer no Stripe devolve lista vazia sem chamar o Stripe', async () => {
    app = await buildTestApp(
      createPrismaFake({ store: { findUnique: vi.fn(async () => ({ stripeCustomerId: null })) } })
    )
    const listSpy = vi.spyOn(app.stripe, 'listInvoices')
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'GET',
      url: '/api/billing/invoices',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ data: [], hasMore: false })
    expect(listSpy).not.toHaveBeenCalled()
  })

  it('lista as faturas do Customer, convertendo a data para ISO', async () => {
    app = await buildTestApp(
      createPrismaFake({ store: { findUnique: vi.fn(async () => ({ stripeCustomerId: 'cus_1' })) } })
    )
    vi.spyOn(app.stripe, 'listInvoices').mockResolvedValue({
      data: [
        { id: 'in_1', createdAt: 1_700_000_000, amountInCents: 11000, currency: 'brl', status: 'paid', hostedInvoiceUrl: 'https://stripe/inv_1' },
      ],
      hasMore: true,
    })
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'GET',
      url: '/api/billing/invoices',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.hasMore).toBe(true)
    // Só a fatura real do Stripe — nada sintético
    expect(body.data).toHaveLength(1)
    expect(body.data[0]).toMatchObject({
      id: 'in_1',
      amountInCents: 11000,
      status: 'paid',
      hostedInvoiceUrl: 'https://stripe/inv_1',
    })
    expect(body.data[0].createdAt).toBe(new Date(1_700_000_000 * 1000).toISOString())
  })

  it('repassa o cursor startingAfter para a paginação do Stripe', async () => {
    app = await buildTestApp(
      createPrismaFake({ store: { findUnique: vi.fn(async () => ({ stripeCustomerId: 'cus_1' })) } })
    )
    const listSpy = vi.spyOn(app.stripe, 'listInvoices').mockResolvedValue({ data: [], hasMore: false })
    const token = await createTestToken(app)

    await app.inject({
      method: 'GET',
      url: '/api/billing/invoices?startingAfter=in_9',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ customerId: 'cus_1', startingAfter: 'in_9' }))
  })
})
