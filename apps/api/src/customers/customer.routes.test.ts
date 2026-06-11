// Testes das rotas de clientes — cadastro público minimalista e lista protegida
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken } from '../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

const cliente = {
  id: 'cli1',
  name: 'Maria Silva',
  phone: '81999999999',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('POST /api/customers', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('registra o cliente e responde apenas a confirmação (sem expor os dados)', async () => {
    app = await buildTestApp(
      createPrismaFake({
        customer: { upsert: vi.fn(async () => cliente) },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/customers',
      payload: { name: 'Maria Silva', phone: '81999999999' },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    // Nome e telefone não voltam na resposta pública
    expect(body.name).toBeUndefined()
    expect(body.phone).toBeUndefined()
  })

  it('rejeita telefone com caracteres inválidos', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/customers',
      payload: { name: 'Maria', phone: 'abc<script>' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('rejeita nome muito curto', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/customers',
      payload: { name: 'M', phone: '81999999999' },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('GET /api/customers', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('exige autenticação — dados pessoais só para o admin', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({ method: 'GET', url: '/api/customers' })

    expect(response.statusCode).toBe(401)
  })

  it('retorna a lista para um admin autenticado', async () => {
    app = await buildTestApp(
      createPrismaFake({
        customer: { findMany: vi.fn(async () => [cliente]) },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'GET',
      url: '/api/customers',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toHaveLength(1)
  })
})
