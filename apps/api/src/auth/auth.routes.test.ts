// Testes das rotas de autenticação — cadastro de loja, login e força bruta
import { describe, it, expect, afterEach, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { createPrismaFake, buildTestApp, createTestToken, LOJA_TESTE } from '../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

describe('POST /api/auth/register (cadastro público de loja)', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('cria a loja, o perfil e o primeiro usuário juntos', async () => {
    const storeCreate = vi.fn(async () => ({ id: 'loja-nova', slug: 'perfumaria-ana', name: 'Perfumaria Ana' }))
    const profileCreate = vi.fn(async () => ({}))
    const userCreate = vi.fn(async () => ({
      id: 'u1', email: 'ana@loja.com', storeId: 'loja-nova', createdAt: new Date(),
    }))

    app = await buildTestApp(
      createPrismaFake({
        user: { findUnique: vi.fn(async () => null), create: userCreate },
        store: { findUnique: vi.fn(async () => null), create: storeCreate },
        storeProfile: { create: profileCreate },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'ana@loja.com',
        password: 'senha-segura-123',
        storeName: 'Perfumaria Ana',
        storeSlug: 'perfumaria-ana',
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.email).toBe('ana@loja.com')
    expect(body.store.slug).toBe('perfumaria-ana')
    // A senha (mesmo criptografada) nunca deve aparecer na resposta
    expect(body.password).toBeUndefined()
    // Loja, perfil e usuário criados na mesma transação
    expect(storeCreate).toHaveBeenCalled()
    expect(profileCreate).toHaveBeenCalled()
    expect(userCreate).toHaveBeenCalled()
  })

  it('rejeita cadastro sem o nome e o endereço da loja', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'ana@loja.com', password: 'senha-segura-123' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('rejeita slug reservado (ex: admin)', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'ana@loja.com',
        password: 'senha-segura-123',
        storeName: 'Loja Admin',
        storeSlug: 'admin',
      },
    })

    expect(response.statusCode).toBe(400)
  })

  it('rejeita slug que já está em uso por outra loja', async () => {
    app = await buildTestApp(
      createPrismaFake({
        user: { findUnique: vi.fn(async () => null) },
        // O slug consultado já pertence a uma loja existente
        store: { findUnique: vi.fn(async () => LOJA_TESTE) },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'ana@loja.com',
        password: 'senha-segura-123',
        storeName: 'Loja Teste',
        storeSlug: 'loja-teste',
      },
    })

    expect(response.statusCode).toBe(409)
  })

  it('admin autenticado cria mais um usuário na própria loja', async () => {
    const userCreate = vi.fn(async () => ({
      id: 'u2', email: 'novo@loja.com', storeId: LOJA_TESTE.id, createdAt: new Date(),
    }))
    app = await buildTestApp(
      createPrismaFake({
        user: { findUnique: vi.fn(async () => null), create: userCreate },
      })
    )
    const token = await createTestToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'novo@loja.com', password: 'senha-segura-123' },
    })

    expect(response.statusCode).toBe(201)
    // O novo usuário nasce na loja de quem criou — nunca em outra
    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ storeId: LOJA_TESTE.id }),
      })
    )
  })

  it('rejeita senha com menos de 8 caracteres', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'ana@loja.com',
        password: '1234567',
        storeName: 'Loja',
        storeSlug: 'loja-da-ana',
      },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('retorna token e os dados da loja quando as credenciais estão corretas', async () => {
    const hashed = await bcrypt.hash('senha-correta-123', 10)
    app = await buildTestApp(
      createPrismaFake({
        user: {
          findUnique: vi.fn(async () => ({
            id: 'u1', email: 'admin@loja.com', password: hashed, storeId: LOJA_TESTE.id,
          })),
        },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@loja.com', password: 'senha-correta-123' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.token).toBeTruthy()
    // O slug volta para o painel montar o link "ver minha loja"
    expect(body.store.slug).toBe(LOJA_TESTE.slug)
  })

  it('retorna 401 com a mesma mensagem para email inexistente e senha errada', async () => {
    const hashed = await bcrypt.hash('senha-correta-123', 10)
    app = await buildTestApp(
      createPrismaFake({
        user: {
          findUnique: vi.fn(async ({ where }: any) =>
            where.email === 'admin@loja.com'
              ? { id: 'u1', email: 'admin@loja.com', password: hashed, storeId: LOJA_TESTE.id }
              : null
          ),
        },
      })
    )

    const emailErrado = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nao-existe@loja.com', password: 'qualquer-coisa' },
    })
    const senhaErrada = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@loja.com', password: 'senha-errada' },
    })

    expect(emailErrado.statusCode).toBe(401)
    expect(senhaErrada.statusCode).toBe(401)
    // Mensagens iguais — não revela se o email está cadastrado
    expect(emailErrado.json().message).toBe(senhaErrada.json().message)
  })

  it('bloqueia tentativas em excesso (proteção contra força bruta)', async () => {
    app = await buildTestApp(
      createPrismaFake({
        user: { findUnique: vi.fn(async () => null) },
      })
    )

    // O limite do login é 10 por minuto — a 11ª tentativa deve ser bloqueada
    let last = 0
    for (let i = 0; i < 11; i++) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'admin@loja.com', password: 'tentativa-de-invasao' },
      })
      last = response.statusCode
    }

    expect(last).toBe(429)
  })

  it('token antigo sem storeId é recusado nas rotas protegidas', async () => {
    app = await buildTestApp(createPrismaFake({}))
    // Simula um token emitido antes do multi-tenancy (sem a loja)
    const tokenAntigo = app.jwt.sign({ sub: 'u1', email: 'admin@loja.com' } as never)

    const response = await app.inject({
      method: 'GET',
      url: '/api/coupons',
      headers: { authorization: `Bearer ${tokenAntigo}` },
    })

    expect(response.statusCode).toBe(401)
  })
})
