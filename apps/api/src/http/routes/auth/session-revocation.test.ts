// Testes da revogação de sessão (LGPD, Fase 4.4) — logout, troca de senha e
// remoção de membro invalidam os tokens emitidos antes da marca de revogação
import { describe, it, expect, afterEach, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { createPrismaFake, buildTestApp, createTestToken, LOJA_TESTE } from '../../../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

// Rota protegida usada para verificar se um token ainda vale
async function consultarRotaProtegida(app: TestApp, token: string) {
  return app.inject({
    method: 'GET',
    url: '/api/customers',
    headers: { authorization: `Bearer ${token}` },
  })
}

describe('POST /api/auth/logout (revogação de sessão — LGPD)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('exige autenticação', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({ method: 'POST', url: '/api/auth/logout' })

    expect(response.statusCode).toBe(401)
  })

  it('revoga o token — a próxima requisição com ele é recusada', async () => {
    app = await buildTestApp(
      createPrismaFake({ customer: { findMany: vi.fn(async () => []) } })
    )
    const token = await createTestToken(app)

    // Antes do logout o token funciona
    const antes = await consultarRotaProtegida(app, token)
    expect(antes.statusCode).toBe(200)

    const logout = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(logout.statusCode).toBe(204)

    // Depois do logout o mesmo token é recusado
    const depois = await consultarRotaProtegida(app, token)
    expect(depois.statusCode).toBe(401)
  })

  it('não afeta tokens de outros usuários', async () => {
    app = await buildTestApp(
      createPrismaFake({ customer: { findMany: vi.fn(async () => []) } })
    )
    const tokenAna = await createTestToken(app, undefined, { sub: 'usuario-ana' })
    const tokenBia = await createTestToken(app, undefined, { sub: 'usuario-bia' })

    await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { authorization: `Bearer ${tokenAna}` },
    })

    // A sessão da Bia continua válida — só a da Ana foi revogada
    const respostaBia = await consultarRotaProtegida(app, tokenBia)
    expect(respostaBia.statusCode).toBe(200)
    const respostaAna = await consultarRotaProtegida(app, tokenAna)
    expect(respostaAna.statusCode).toBe(401)
  })
})

describe('Troca de senha revoga as sessões antigas (LGPD)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('após trocar a senha, o token usado na troca deixa de valer', async () => {
    const hashed = await bcrypt.hash('senha-atual-123', 10)
    app = await buildTestApp(
      createPrismaFake({
        user: {
          findFirst: vi.fn(async () => ({
            id: 'usuario-teste', password: hashed, mustChangePassword: false,
          })),
          updateMany: vi.fn(async () => ({ count: 1 })),
        },
        customer: { findMany: vi.fn(async () => []) },
      })
    )
    const token = await createTestToken(app, undefined, { sub: 'usuario-teste' })

    const troca = await app.inject({
      method: 'PUT',
      url: '/api/auth/change-password',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentPassword: 'senha-atual-123', newPassword: 'senha-nova-12345' },
    })
    expect(troca.statusCode).toBe(200)

    // O token antigo morre junto com a senha antiga
    const depois = await consultarRotaProtegida(app, token)
    expect(depois.statusCode).toBe(401)
  })
})

describe('Remoção de membro revoga a sessão dele (LGPD)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('o token do membro removido deixa de valer imediatamente', async () => {
    app = await buildTestApp(
      createPrismaFake({
        user: {
          findFirst: vi.fn(async () => ({ email: 'membro@loja.com' })),
          deleteMany: vi.fn(async () => ({ count: 1 })),
        },
        customer: { findMany: vi.fn(async () => []) },
      })
    )
    const tokenOwner = await createTestToken(app, undefined, { sub: 'usuario-owner' })
    const tokenMembro = await createTestToken(app, undefined, { sub: 'membro-1', role: 'STAFF' })

    // Antes da remoção o membro acessa normalmente
    const antes = await consultarRotaProtegida(app, tokenMembro)
    expect(antes.statusCode).toBe(200)

    const remocao = await app.inject({
      method: 'DELETE',
      url: '/api/users/membro-1',
      headers: { authorization: `Bearer ${tokenOwner}` },
    })
    expect(remocao.statusCode).toBe(204)

    // O token do removido é recusado; o do OWNER continua valendo
    const depoisMembro = await consultarRotaProtegida(app, tokenMembro)
    expect(depoisMembro.statusCode).toBe(401)
    const depoisOwner = await consultarRotaProtegida(app, tokenOwner)
    expect(depoisOwner.statusCode).toBe(200)
  })
})
