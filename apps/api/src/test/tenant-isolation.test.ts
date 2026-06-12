// Testes de isolamento entre lojas — provam que a loja A nunca enxerga,
// altera ou exclui dados da loja B. Usa um banco falso em memória com duas
// lojas, que filtra de verdade pelos campos recebidos no where.
import { describe, it, expect, afterEach, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { createPrismaFake, buildTestApp, createTestToken } from './test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

const LOJA_A = { id: 'loja-a', slug: 'loja-a', name: 'Loja A', status: 'ACTIVE', createdAt: new Date() }
const LOJA_B = { id: 'loja-b', slug: 'loja-b', name: 'Loja B', status: 'ACTIVE', createdAt: new Date() }

const baseProduto = {
  brand: null,
  description: null,
  price: 100,
  originalPrice: null,
  imageUrl: null,
  categories: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Banco falso com duas lojas e dados em memória — cada método respeita o where
function criaBancoComDuasLojas() {
  const produtos = [
    { ...baseProduto, id: 'produto-a', name: 'Produto da Loja A', storeId: LOJA_A.id },
    { ...baseProduto, id: 'produto-b', name: 'Produto da Loja B', storeId: LOJA_B.id },
  ]
  // Cada loja tem a própria assinatura, em planos diferentes
  const assinaturas = [
    { id: 'sub-a', storeId: LOJA_A.id, planId: 'plan-x', status: 'ACTIVE', createdAt: new Date(), plan: { id: 'plan-x', name: 'Plano X', limits: {}, priceInCents: 0 } },
    { id: 'sub-b', storeId: LOJA_B.id, planId: 'plan-y', status: 'ACTIVE', createdAt: new Date(), plan: { id: 'plan-y', name: 'Plano Y', limits: {}, priceInCents: 0 } },
  ]
  // O mesmo código de cupom existe nas duas lojas — cada uma com um desconto
  const cupons = [
    { id: 'cupom-a', code: 'PROMO10', discountType: 'percentage', discountPercent: 10, discountValue: null, minimumOrderValue: null, maxUses: null, usedCount: 0, maxUsesPerUser: null, productIds: [], startDate: null, endDate: null, active: true, description: null, storeId: LOJA_A.id, createdAt: new Date() },
    { id: 'cupom-b', code: 'PROMO10', discountType: 'percentage', discountPercent: 50, discountValue: null, minimumOrderValue: null, maxUses: null, usedCount: 0, maxUsesPerUser: null, productIds: [], startDate: null, endDate: null, active: true, description: null, storeId: LOJA_B.id, createdAt: new Date() },
  ]

  return createPrismaFake({
    store: {
      findUnique: vi.fn(async (args: unknown) => {
        const where = (args as { where?: { slug?: string; id?: string } })?.where
        if (where?.slug === LOJA_A.slug || where?.id === LOJA_A.id) return LOJA_A
        if (where?.slug === LOJA_B.slug || where?.id === LOJA_B.id) return LOJA_B
        return null
      }),
    },
    product: {
      findMany: vi.fn(async (args: unknown) => {
        const where = (args as { where?: { storeId?: string } })?.where
        return produtos.filter((p) => p.storeId === where?.storeId)
      }),
      count: vi.fn(async (args: unknown) => {
        const where = (args as { where?: { storeId?: string } })?.where
        return produtos.filter((p) => p.storeId === where?.storeId).length
      }),
      findFirst: vi.fn(async (args: unknown) => {
        const where = (args as { where?: { id?: string; storeId?: string } })?.where
        return produtos.find((p) => p.id === where?.id && p.storeId === where?.storeId) ?? null
      }),
      deleteMany: vi.fn(async (args: unknown) => {
        const where = (args as { where?: { id?: string; storeId?: string } })?.where
        return { count: produtos.filter((p) => p.id === where?.id && p.storeId === where?.storeId).length }
      }),
    },
    coupon: {
      findUnique: vi.fn(async (args: unknown) => {
        const where = (args as { where?: { storeId_code?: { storeId: string; code: string } } })?.where
        const chave = where?.storeId_code
        return cupons.find((c) => c.storeId === chave?.storeId && c.code === chave?.code) ?? null
      }),
      findMany: vi.fn(async (args: unknown) => {
        const where = (args as { where?: { storeId?: string } })?.where
        return cupons.filter((c) => c.storeId === where?.storeId)
      }),
    },
    subscription: {
      findFirst: vi.fn(async (args: unknown) => {
        const where = (args as { where?: { storeId?: string } })?.where
        return assinaturas.find((s) => s.storeId === where?.storeId) ?? null
      }),
    },
    // Contagens usadas pelo GET /api/billing/current
    user: { count: vi.fn(async () => 1) },
    order: { count: vi.fn(async () => 0) },
  })
}

describe('isolamento entre lojas', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('o catálogo público de cada loja mostra apenas os próprios produtos', async () => {
    app = await buildTestApp(criaBancoComDuasLojas() as PrismaClient)

    const catalogoA = await app.inject({ method: 'GET', url: '/api/lojas/loja-a/products' })
    const catalogoB = await app.inject({ method: 'GET', url: '/api/lojas/loja-b/products' })

    expect(catalogoA.json().data.map((p: { id: string }) => p.id)).toEqual(['produto-a'])
    expect(catalogoB.json().data.map((p: { id: string }) => p.id)).toEqual(['produto-b'])
  })

  it('produto de uma loja não é acessível pelo slug de outra', async () => {
    app = await buildTestApp(criaBancoComDuasLojas() as PrismaClient)

    const response = await app.inject({ method: 'GET', url: '/api/lojas/loja-a/products/produto-b' })

    expect(response.statusCode).toBe(404)
  })

  it('admin da loja A não exclui produto da loja B', async () => {
    app = await buildTestApp(criaBancoComDuasLojas() as PrismaClient)
    const tokenLojaA = await createTestToken(app, LOJA_A.id)

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/products/produto-b',
      headers: { authorization: `Bearer ${tokenLojaA}` },
    })

    // Para a loja A, o produto da loja B simplesmente não existe
    expect(response.statusCode).toBe(404)
  })

  it('a lista de cupons do admin traz apenas os da própria loja', async () => {
    app = await buildTestApp(criaBancoComDuasLojas() as PrismaClient)
    const tokenLojaA = await createTestToken(app, LOJA_A.id)

    const response = await app.inject({
      method: 'GET',
      url: '/api/coupons',
      headers: { authorization: `Bearer ${tokenLojaA}` },
    })

    const ids = response.json().map((c: { id: string }) => c.id)
    expect(ids).toEqual(['cupom-a'])
  })

  it('a assinatura retornada é sempre a da própria loja', async () => {
    app = await buildTestApp(criaBancoComDuasLojas() as PrismaClient)
    const tokenLojaA = await createTestToken(app, LOJA_A.id)
    const tokenLojaB = await createTestToken(app, LOJA_B.id)

    const billingA = await app.inject({
      method: 'GET',
      url: '/api/billing/current',
      headers: { authorization: `Bearer ${tokenLojaA}` },
    })
    const billingB = await app.inject({
      method: 'GET',
      url: '/api/billing/current',
      headers: { authorization: `Bearer ${tokenLojaB}` },
    })

    // Cada loja enxerga apenas o próprio plano
    expect(billingA.json().subscription.plan.id).toBe('plan-x')
    expect(billingB.json().subscription.plan.id).toBe('plan-y')
  })

  it('o mesmo código de cupom vale de forma independente em cada loja', async () => {
    app = await buildTestApp(criaBancoComDuasLojas() as PrismaClient)

    const cupomNaLojaA = await app.inject({ method: 'GET', url: '/api/lojas/loja-a/coupons/codigo/PROMO10' })
    const cupomNaLojaB = await app.inject({ method: 'GET', url: '/api/lojas/loja-b/coupons/codigo/PROMO10' })

    // Cada loja aplica o próprio desconto — 10% na A, 50% na B
    expect(cupomNaLojaA.json().discountPercent).toBe(10)
    expect(cupomNaLojaB.json().discountPercent).toBe(50)
  })

  it('slug inexistente responde 404 sem revelar nada', async () => {
    app = await buildTestApp(criaBancoComDuasLojas() as PrismaClient)

    const response = await app.inject({ method: 'GET', url: '/api/lojas/loja-que-nao-existe/products' })

    expect(response.statusCode).toBe(404)
    expect(response.json().message).toBe('Loja não encontrada')
  })

  it('loja suspensa some do catálogo público', async () => {
    const suspensa = { ...LOJA_A, status: 'SUSPENDED' }
    app = await buildTestApp(
      createPrismaFake({
        store: { findUnique: vi.fn(async () => suspensa) },
      })
    )

    const response = await app.inject({ method: 'GET', url: '/api/lojas/loja-a/products' })

    expect(response.statusCode).toBe(404)
  })
})
