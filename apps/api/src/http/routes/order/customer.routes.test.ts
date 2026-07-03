// Testes das rotas de clientes — cadastro público minimalista e lista protegida
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken, LOJA_TESTE } from '../../../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

const cliente = {
  id: 'cli1',
  name: 'Maria Silva',
  phone: '81999999999',
  storeId: LOJA_TESTE.id,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('POST /api/lojas/:slug/customers', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('registra o cliente na loja do slug e responde apenas a confirmação', async () => {
    const upsert = vi.fn(async () => cliente)
    app = await buildTestApp(createPrismaFake({ customer: { upsert } }))

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/customers',
      payload: { name: 'Maria Silva', phone: '81999999999' },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    // Nome e telefone não voltam na resposta pública
    expect(body.name).toBeUndefined()
    expect(body.phone).toBeUndefined()
    // O telefone identifica o cliente DENTRO da loja — chave composta loja + telefone.
    // O número é salvo normalizado com o código do Brasil (55) para links wa.me
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId_phone: { storeId: LOJA_TESTE.id, phone: '5581999999999' } },
      })
    )
  })

  it('rejeita telefone com caracteres inválidos', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/customers',
      payload: { name: 'Maria', phone: 'abc<script>' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('rejeita nome muito curto', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/lojas/loja-teste/customers',
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

  it('retorna apenas os clientes da loja do admin autenticado', async () => {
    const findMany = vi.fn(async () => [cliente])
    app = await buildTestApp(createPrismaFake({ customer: { findMany } }))
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'GET',
      url: '/api/customers',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toHaveLength(1)
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storeId: LOJA_TESTE.id } })
    )
  })
})
