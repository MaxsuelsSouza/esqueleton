// Testes do cron de reconciliação de assinaturas — GET /api/jobs/verificar-assinaturas
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, LOJA_TESTE } from '../../../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

describe('GET /api/jobs/verificar-assinaturas', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
    delete process.env.CRON_SECRET
  })

  it('sem Stripe configurado, não reconcilia nada', async () => {
    app = await buildTestApp(createPrismaFake({}))
    const response = await app.inject({ method: 'GET', url: '/api/jobs/verificar-assinaturas' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ verificadas: 0, corrigidas: 0 })
  })

  it('com CRON_SECRET, requisição sem o token é recusada (401)', async () => {
    process.env.CRON_SECRET = 'segredo'
    app = await buildTestApp(createPrismaFake({}))
    const response = await app.inject({ method: 'GET', url: '/api/jobs/verificar-assinaturas' })
    expect(response.statusCode).toBe(401)
  })

  it('corrige o status quando o Stripe diverge do banco', async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }))
    app = await buildTestApp(
      createPrismaFake({
        subscription: {
          findMany: vi.fn(async () => [
            { id: 's1', storeId: LOJA_TESTE.id, status: 'ACTIVE', stripeSubscriptionId: 'sub_1' },
          ]),
          updateMany,
        },
      })
    )
    // Habilita a reconciliação e simula o Stripe dizendo que a assinatura foi cancelada
    app.stripe.isConfigured = true
    vi.spyOn(app.stripe, 'getSubscriptionStatus').mockResolvedValue('canceled')

    const response = await app.inject({ method: 'GET', url: '/api/jobs/verificar-assinaturas' })

    expect(response.statusCode).toBe(200)
    expect(response.json().resultado).toMatchObject({ verificadas: 1, corrigidas: 1 })
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1', storeId: LOJA_TESTE.id },
        data: expect.objectContaining({ status: 'CANCELLED' }),
      })
    )
  })

  it('não altera nada quando o Stripe confirma o mesmo status', async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }))
    app = await buildTestApp(
      createPrismaFake({
        subscription: {
          findMany: vi.fn(async () => [
            { id: 's1', storeId: LOJA_TESTE.id, status: 'ACTIVE', stripeSubscriptionId: 'sub_1' },
          ]),
          updateMany,
        },
      })
    )
    app.stripe.isConfigured = true
    vi.spyOn(app.stripe, 'getSubscriptionStatus').mockResolvedValue('active')

    const response = await app.inject({ method: 'GET', url: '/api/jobs/verificar-assinaturas' })

    expect(response.statusCode).toBe(200)
    expect(response.json().resultado).toMatchObject({ verificadas: 1, corrigidas: 0 })
    expect(updateMany).not.toHaveBeenCalled()
  })
})
