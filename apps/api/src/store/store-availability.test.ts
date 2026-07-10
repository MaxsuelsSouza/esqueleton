// Testes da disponibilidade da loja ("pagou, usou") — o catálogo público
// funciona nos 7 dias de teste; depois, só com assinatura ativa
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp } from '../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

const UM_DIA = 24 * 60 * 60 * 1000

// Monta o banco falso com uma loja criada há N dias e com uma assinatura no status
// informado (ou nenhuma) — 'ACTIVE', 'PENDING_SETUP' ou null (sem assinatura)
function bancoComLoja(diasDesdeOCadastro: number, statusAssinatura: 'ACTIVE' | 'PENDING_SETUP' | null) {
  return createPrismaFake({
    store: {
      findUnique: vi.fn(async () => ({
        id: 'loja-1',
        slug: 'loja-um',
        name: 'Loja Um',
        status: 'ACTIVE',
        createdAt: new Date(Date.now() - diasDesdeOCadastro * UM_DIA),
      })),
    },
    subscription: {
      findFirst: vi.fn(async ({ where }: any) => {
        if (!statusAssinatura || where?.status !== statusAssinatura) return null
        return { id: 'sub1', storeId: 'loja-1', status: statusAssinatura }
      }),
    },
    product: { findMany: vi.fn(async () => []), count: vi.fn(async () => 0) },
  })
}

describe('disponibilidade do catálogo público', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('loja dentro do período de teste responde normalmente, mesmo sem assinatura', async () => {
    app = await buildTestApp(bancoComLoja(2, null))

    const response = await app.inject({ method: 'GET', url: '/api/lojas/loja-um/products' })

    expect(response.statusCode).toBe(200)
  })

  it('teste vencido sem assinatura responde um erro genérico (sem revelar o motivo)', async () => {
    app = await buildTestApp(bancoComLoja(8, null))

    const response = await app.inject({ method: 'GET', url: '/api/lojas/loja-um/products' })

    expect(response.statusCode).toBe(503)
    expect(response.json().message).toContain('Ops')
    // A mensagem não menciona pagamento nem assinatura — o cliente final não deve saber
    expect(response.json().message).not.toMatch(/assinatura|pagamento|plano/i)
  })

  it('teste vencido com assinatura ativa responde normalmente', async () => {
    app = await buildTestApp(bancoComLoja(30, 'ACTIVE'))

    const response = await app.inject({ method: 'GET', url: '/api/lojas/loja-um/products' })

    expect(response.statusCode).toBe(200)
  })

  it('o bloqueio vale para todas as rotas públicas da loja, não só o catálogo', async () => {
    app = await buildTestApp(bancoComLoja(8, null))

    const pedido = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-um/orders',
      payload: {},
    })

    expect(pedido.statusCode).toBe(503)
  })

  it('loja de venda presencial aguardando confirmação da implantação fica indisponível mesmo dentro do prazo de teste', async () => {
    app = await buildTestApp(bancoComLoja(2, 'PENDING_SETUP'))

    const response = await app.inject({ method: 'GET', url: '/api/lojas/loja-um/products' })

    expect(response.statusCode).toBe(503)
  })
})
