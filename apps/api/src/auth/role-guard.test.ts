// Testes do guard de papéis — OWNER tem acesso à gestão de equipe, STAFF não
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken } from '../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

describe('requireOwner (via rotas de equipe)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('OWNER lista os usuários da loja', async () => {
    const findMany = vi.fn(async () => [
      { id: 'u1', email: 'dono@loja.com', role: 'OWNER', emailVerified: true, createdAt: new Date() },
    ])
    app = await buildTestApp(createPrismaFake({ user: { findMany } }))
    const token = await createTestToken(app) // role OWNER por padrão

    const response = await app.inject({
      method: 'GET',
      url: '/api/users',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toHaveLength(1)
  })

  it('STAFF recebe 403 nas rotas de equipe', async () => {
    app = await buildTestApp(createPrismaFake({}))
    const token = await createTestToken(app, undefined, { role: 'STAFF' })

    const lista = await app.inject({
      method: 'GET',
      url: '/api/users',
      headers: { authorization: `Bearer ${token}` },
    })
    const remocao = await app.inject({
      method: 'DELETE',
      url: '/api/users/u2',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(lista.statusCode).toBe(403)
    expect(remocao.statusCode).toBe(403)
  })

  it('OWNER não pode remover a si mesmo', async () => {
    app = await buildTestApp(createPrismaFake({}))
    const token = await createTestToken(app, undefined, { sub: 'usuario-dono' })

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/users/usuario-dono',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(400)
  })
})
