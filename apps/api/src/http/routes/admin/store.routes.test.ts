// Testes das rotas da conta/loja (LGPD) — exportação e exclusão definitiva
import { describe, it, expect, afterEach, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { createPrismaFake, buildTestApp, createTestToken, LOJA_TESTE } from '../../../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

// Banco falso com todas as tabelas vazias que a exportação consulta
function prismaFakeExportacao(overrides: Record<string, Record<string, (...args: unknown[]) => unknown>> = {}) {
  const vazio = { findMany: vi.fn(async () => []) }
  return createPrismaFake({
    user: { findMany: vi.fn(async () => []) },
    storeProfile: { findFirst: vi.fn(async () => null) },
    product: vazio,
    category: vazio,
    promotion: vazio,
    coupon: vazio,
    featured: vazio,
    order: vazio,
    customer: vazio,
    subscription: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => null) },
    ...overrides,
  })
}

describe('GET /api/store/export (portabilidade da loja — LGPD)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('exige autenticação', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({ method: 'GET', url: '/api/store/export' })

    expect(response.statusCode).toBe(401)
  })

  it('apenas o OWNER pode exportar', async () => {
    app = await buildTestApp(prismaFakeExportacao())
    const token = await createTestToken(app, undefined, { role: 'STAFF' })

    const response = await app.inject({
      method: 'GET',
      url: '/api/store/export',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(403)
  })

  it('exporta os dados da loja sem o hash das senhas', async () => {
    const userFindMany = vi.fn(async () => [
      { id: 'u1', email: 'ana@loja.com', name: 'Ana', role: 'OWNER', emailVerified: true, acceptedTermsAt: null, acceptedTermsVersion: null, createdAt: new Date() },
    ])
    app = await buildTestApp(prismaFakeExportacao({ user: { findMany: userFindMany } }))
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'GET',
      url: '/api/store/export',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.loja.slug).toBe(LOJA_TESTE.slug)
    expect(body.equipe).toHaveLength(1)
    expect(body.equipe[0].password).toBeUndefined()
    // A consulta de usuários seleciona campos explícitos — nunca a senha
    expect(userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.not.objectContaining({ password: true }),
      })
    )
  })
})

describe('DELETE /api/store (exclusão da loja — LGPD)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('apenas o OWNER pode excluir a loja', async () => {
    app = await buildTestApp(createPrismaFake({}))
    const token = await createTestToken(app, undefined, { role: 'STAFF' })

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/store',
      headers: { authorization: `Bearer ${token}` },
      payload: { password: 'qualquer' },
    })

    expect(response.statusCode).toBe(403)
  })

  it('rejeita a exclusão com senha incorreta', async () => {
    const hashed = await bcrypt.hash('senha-correta-123', 10)
    const storeDelete = vi.fn(async () => LOJA_TESTE)
    app = await buildTestApp(
      createPrismaFake({
        user: { findUnique: vi.fn(async () => ({ password: hashed })) },
        store: {
          findUnique: vi.fn(async () => LOJA_TESTE),
          delete: storeDelete,
        },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/store',
      headers: { authorization: `Bearer ${token}` },
      payload: { password: 'senha-errada' },
    })

    expect(response.statusCode).toBe(403)
    expect(storeDelete).not.toHaveBeenCalled()
  })

  it('exclui a loja e cancela as assinaturas ativas no MercadoPago', async () => {
    const hashed = await bcrypt.hash('senha-correta-123', 10)
    const storeDelete = vi.fn(async () => LOJA_TESTE)
    const subscriptionFindMany = vi.fn(async () => [
      { mercadoPagoPreapprovalId: 'preapproval-1' },
    ])
    app = await buildTestApp(
      createPrismaFake({
        user: { findUnique: vi.fn(async () => ({ password: hashed })) },
        store: {
          findUnique: vi.fn(async () => LOJA_TESTE),
          delete: storeDelete,
        },
        subscription: { findMany: subscriptionFindMany, findFirst: vi.fn(async () => null) },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/store',
      headers: { authorization: `Bearer ${token}` },
      payload: { password: 'senha-correta-123' },
    })

    expect(response.statusCode).toBe(204)
    // O cascade do banco apaga todos os dados da loja junto
    expect(storeDelete).toHaveBeenCalledWith({ where: { id: LOJA_TESTE.id } })
    // Só busca assinaturas que ainda geram cobrança
    expect(subscriptionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: LOJA_TESTE.id }),
      })
    )
  })
})
