// Testes das rotas de produtos — listagem pública por loja e escrita protegida
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken, LOJA_TESTE } from '../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

const produto = {
  id: 'p1',
  brand: 'Marca',
  name: 'Perfume Teste',
  description: null,
  price: 100,
  originalPrice: null,
  imageUrl: null,
  storeId: LOJA_TESTE.id,
  categories: [{ categoryId: 'cat1' }],
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /api/lojas/:slug/products (catálogo público)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('lista produtos da loja com paginação', async () => {
    const findMany = vi.fn(async () => [produto])
    app = await buildTestApp(
      createPrismaFake({
        product: { findMany, count: vi.fn(async () => 1) },
      })
    )

    const response = await app.inject({ method: 'GET', url: '/api/lojas/loja-teste/products' })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data).toHaveLength(1)
    // A relação interna "categories" é convertida para a lista simples categoryIds
    expect(body.data[0].categoryIds).toEqual(['cat1'])
    // A consulta sempre filtra pela loja do slug
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ storeId: LOJA_TESTE.id }) })
    )
  })

  it('retorna 404 para slug de loja inexistente', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({ method: 'GET', url: '/api/lojas/loja-fantasma/products' })

    expect(response.statusCode).toBe(404)
    expect(response.json().message).toBe('Loja não encontrada')
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
      url: '/api/lojas/loja-teste/products?page=abc&pageSize=xyz&priceMin=abc&priceMax=xyz',
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

    await app.inject({ method: 'GET', url: '/api/lojas/loja-teste/products?pageSize=99999' })

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
      url: `/api/lojas/loja-teste/products?ids=${encodeURIComponent("p1,' OR 1=1,p2")}`,
    })

    // Apenas os IDs válidos chegam à consulta — sempre limitada à loja
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['p1', 'p2'] }, storeId: LOJA_TESTE.id } })
    )
  })
})

describe('rotas admin de produtos', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('listagem, escrita e exclusão exigem autenticação', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const lista = await app.inject({ method: 'GET', url: '/api/products' })
    const post = await app.inject({ method: 'POST', url: '/api/products', payload: {} })
    const put = await app.inject({ method: 'PUT', url: '/api/products/p1', payload: {} })
    const del = await app.inject({ method: 'DELETE', url: '/api/products/p1' })

    expect(lista.statusCode).toBe(401)
    expect(post.statusCode).toBe(401)
    expect(put.statusCode).toBe(401)
    expect(del.statusCode).toBe(401)
  })

  it('cria produto com dados válidos na loja do token', async () => {
    const create = vi.fn(async () => produto)
    app = await buildTestApp(
      createPrismaFake({
        product: { create },
        category: { count: vi.fn(async () => 1) },
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
    // O produto nasce na loja do token
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ storeId: LOJA_TESTE.id }) })
    )
  })

  it('rejeita categoria que não pertence à loja', async () => {
    app = await buildTestApp(
      createPrismaFake({
        // Nenhuma das categorias informadas existe nesta loja
        category: { count: vi.fn(async () => 0) },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Perfume', price: 100, categoryIds: ['cat-de-outra-loja'] },
    })

    expect(response.statusCode).toBe(400)
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

  it('não exclui produto de outra loja (responde 404)', async () => {
    app = await buildTestApp(
      createPrismaFake({
        // deleteMany com id + storeId não encontra nada — o produto é de outra loja
        product: { deleteMany: vi.fn(async () => ({ count: 0 })) },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/products/produto-de-outra-loja',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(404)
  })
})
