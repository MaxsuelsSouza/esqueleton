// Testes das rotas de produtos — listagem pública resiliente e escrita protegida
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken } from '../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

const produto = {
  id: 'p1',
  brand: 'Marca',
  name: 'Perfume Teste',
  description: null,
  price: 100,
  originalPrice: null,
  imageUrl: null,
  stock: 10,
  categories: [{ categoryId: 'cat1' }],
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /api/products', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('lista produtos com paginação', async () => {
    app = await buildTestApp(
      createPrismaFake({
        product: {
          findMany: vi.fn(async () => [produto]),
          count: vi.fn(async () => 1),
        },
      })
    )

    const response = await app.inject({ method: 'GET', url: '/api/products' })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data).toHaveLength(1)
    // A relação interna "categories" é convertida para a lista simples categoryIds
    expect(body.data[0].categoryIds).toEqual(['cat1'])
  })

  it('não quebra com page e pageSize inválidos (ex: ?page=abc)', async () => {
    const findMany = vi.fn(async () => [])
    app = await buildTestApp(
      createPrismaFake({
        product: { findMany, count: vi.fn(async () => 0) },
      })
    )

    const response = await app.inject({
      method: 'GET',
      url: '/api/products?page=abc&pageSize=xyz&priceMin=abc&priceMax=xyz',
    })

    expect(response.statusCode).toBe(200)
    // Valores inválidos voltam para o padrão: página 1 com 20 itens
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 20 }))
  })

  it('limita o pageSize a 500 mesmo se for pedido mais', async () => {
    const findMany = vi.fn(async () => [])
    app = await buildTestApp(
      createPrismaFake({
        product: { findMany, count: vi.fn(async () => 0) },
      })
    )

    await app.inject({ method: 'GET', url: '/api/products?pageSize=99999' })

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 500 }))
  })

  it('ignora IDs com formato inválido na busca por ids', async () => {
    const findMany = vi.fn(async () => [])
    app = await buildTestApp(
      createPrismaFake({
        product: { findMany, count: vi.fn(async () => 0) },
      })
    )

    await app.inject({
      method: 'GET',
      url: `/api/products?ids=${encodeURIComponent("p1,' OR 1=1,p2")}`,
    })

    // Apenas os IDs válidos chegam à consulta
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['p1', 'p2'] } } })
    )
  })
})

describe('escrita de produtos (POST/PUT/DELETE)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('exige autenticação', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const post = await app.inject({ method: 'POST', url: '/api/products', payload: {} })
    const put = await app.inject({ method: 'PUT', url: '/api/products/p1', payload: {} })
    const del = await app.inject({ method: 'DELETE', url: '/api/products/p1' })

    expect(post.statusCode).toBe(401)
    expect(put.statusCode).toBe(401)
    expect(del.statusCode).toBe(401)
  })

  it('cria produto com dados válidos', async () => {
    app = await buildTestApp(
      createPrismaFake({
        product: { create: vi.fn(async () => produto) },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Perfume Teste', price: 100, categoryIds: ['cat1'] },
    })

    expect(response.statusCode).toBe(201)
  })

  it('rejeita imageUrl com esquema perigoso (ex: javascript:)', async () => {
    app = await buildTestApp(createPrismaFake({}))
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Produto', price: 10, imageUrl: 'javascript:alert(1)' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('rejeita data URI que não seja imagem (ex: data:text/html)', async () => {
    app = await buildTestApp(createPrismaFake({}))
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Produto', price: 10, imageUrl: 'data:text/html;base64,PHNjcmlwdD4=' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('aceita imagem enviada pelo painel (data:image/...;base64)', async () => {
    app = await buildTestApp(
      createPrismaFake({
        product: { create: vi.fn(async () => produto) },
      })
    )
    const token = await createTestToken(app)

    // PNG transparente de 1x1 — imagem base64 válida que o uploader geraria
    const pngBase64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

    const response = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Produto', price: 10, imageUrl: pngBase64 },
    })

    expect(response.statusCode).toBe(201)
  })

  it('rejeita preço negativo ou zero', async () => {
    app = await buildTestApp(createPrismaFake({}))
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Produto', price: 0 },
    })

    expect(response.statusCode).toBe(400)
  })
})
