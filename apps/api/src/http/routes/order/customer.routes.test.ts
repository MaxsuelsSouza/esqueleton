// Testes das rotas de clientes — cadastro público minimalista e lista protegida
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken, LOJA_TESTE } from '../../../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

const cliente = {
  id: 'cli1',
  name: 'Maria Silva',
  phone: '5581999999999',
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

// Ferramentas do art. 18 da LGPD — corrigir, exportar e excluir clientes
describe('PUT /api/customers/:id (retificação — LGPD)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('corrige o cadastro restrito à loja do token (ownership)', async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }))
    const findFirst = vi.fn(async () => ({ ...cliente, name: 'Maria Souza' }))
    app = await buildTestApp(createPrismaFake({ customer: { updateMany, findFirst } }))
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'PUT',
      url: '/api/customers/cli1',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Maria Souza' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().name).toBe('Maria Souza')
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cli1', storeId: LOJA_TESTE.id } })
    )
  })

  it('responde 404 quando o cliente pertence a outra loja', async () => {
    const updateMany = vi.fn(async () => ({ count: 0 }))
    app = await buildTestApp(createPrismaFake({ customer: { updateMany } }))
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'PUT',
      url: '/api/customers/cli-de-outra-loja',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Maria Souza' },
    })

    expect(response.statusCode).toBe(404)
  })

  it('responde 409 quando o telefone novo já pertence a outro cadastro', async () => {
    const updateMany = vi.fn(async () => {
      const conflito = new Error('Unique constraint failed') as Error & { code: string }
      conflito.code = 'P2002'
      throw conflito
    })
    app = await buildTestApp(createPrismaFake({ customer: { updateMany } }))
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'PUT',
      url: '/api/customers/cli1',
      headers: { authorization: `Bearer ${token}` },
      payload: { phone: '81988888888' },
    })

    expect(response.statusCode).toBe(409)
  })
})

describe('GET /api/customers/:id/export (portabilidade — LGPD)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('retorna o cadastro e os pedidos do telefone do cliente', async () => {
    const pedido = {
      id: 'ped1', orderNumber: '123456', items: [], subtotal: 10, discount: 0,
      total: 10, couponCode: null, status: 'SOLD', storeId: LOJA_TESTE.id,
      createdAt: new Date(), updatedAt: new Date(),
      customerName: cliente.name, customerPhone: cliente.phone,
    }
    const orderFindMany = vi.fn(async () => [pedido])
    app = await buildTestApp(
      createPrismaFake({
        customer: { findFirst: vi.fn(async () => cliente) },
        order: { findMany: orderFindMany },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'GET',
      url: '/api/customers/cli1/export',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.cliente.telefone).toBe(cliente.phone)
    expect(body.pedidos).toHaveLength(1)
    // Os pedidos exportados são apenas os do telefone do cliente NESTA loja
    expect(orderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId: LOJA_TESTE.id, customerPhone: cliente.phone },
      })
    )
  })

  it('responde 404 quando o cliente não existe na loja', async () => {
    app = await buildTestApp(
      createPrismaFake({ customer: { findFirst: vi.fn(async () => null) } })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'GET',
      url: '/api/customers/nao-existe/export',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(404)
  })
})

describe('DELETE /api/customers/:id (eliminação — LGPD)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('exclui o cadastro sem tocar nos pedidos quando não pede anonimização', async () => {
    const deleteMany = vi.fn(async () => ({ count: 1 }))
    const orderUpdateMany = vi.fn(async () => ({ count: 0 }))
    app = await buildTestApp(
      createPrismaFake({
        customer: { findFirst: vi.fn(async () => cliente), deleteMany },
        order: { updateMany: orderUpdateMany },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/customers/cli1',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(204)
    expect(deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cli1', storeId: LOJA_TESTE.id } })
    )
    expect(orderUpdateMany).not.toHaveBeenCalled()
  })

  it('anonimiza os pedidos e limpa as notificações quando solicitado', async () => {
    const deleteMany = vi.fn(async () => ({ count: 1 }))
    const orderUpdateMany = vi.fn(async () => ({ count: 2 }))
    const notificationUpdateMany = vi.fn(async () => ({ count: 1 }))
    app = await buildTestApp(
      createPrismaFake({
        customer: { findFirst: vi.fn(async () => cliente), deleteMany },
        order: { updateMany: orderUpdateMany },
        notification: { updateMany: notificationUpdateMany },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/customers/cli1?anonimizarPedidos=true',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(204)
    // Nome e telefone saem do pedido; os valores permanecem para estatística
    expect(orderUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId: LOJA_TESTE.id, customerPhone: cliente.phone },
        data: { customerName: null, customerPhone: null },
      })
    )
    // As notificações de pedido que duplicam os dados no metadata são limpas
    expect(notificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: LOJA_TESTE.id, type: 'NEW_ORDER' }),
      })
    )
  })

  it('responde 404 quando o cliente pertence a outra loja', async () => {
    app = await buildTestApp(
      createPrismaFake({ customer: { findFirst: vi.fn(async () => null) } })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/customers/cli-de-outra-loja',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(404)
  })
})
