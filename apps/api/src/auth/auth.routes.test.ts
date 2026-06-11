// Testes das rotas de autenticação — cadastro protegido, login e força bruta
import { describe, it, expect, afterEach, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { createPrismaFake, buildTestApp, createTestToken } from '../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

describe('POST /api/auth/register', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('permite criar o primeiro usuário sem autenticação (configuração inicial)', async () => {
    app = await buildTestApp(
      createPrismaFake({
        user: {
          count: vi.fn(async () => 0),
          findUnique: vi.fn(async () => null),
          create: vi.fn(async () => ({ id: 'u1', email: 'admin@loja.com', createdAt: new Date() })),
        },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'admin@loja.com', password: 'senha-segura-123' },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.email).toBe('admin@loja.com')
    // A senha (mesmo criptografada) nunca deve aparecer na resposta
    expect(body.password).toBeUndefined()
  })

  it('bloqueia cadastro sem token quando já existe usuário', async () => {
    app = await buildTestApp(
      createPrismaFake({
        user: { count: vi.fn(async () => 1) },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'invasor@mal.com', password: 'senha-qualquer-123' },
    })

    expect(response.statusCode).toBe(403)
  })

  it('permite cadastro com token válido quando já existe usuário', async () => {
    app = await buildTestApp(
      createPrismaFake({
        user: {
          count: vi.fn(async () => 1),
          findUnique: vi.fn(async () => null),
          create: vi.fn(async () => ({ id: 'u2', email: 'novo@loja.com', createdAt: new Date() })),
        },
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
  })

  it('rejeita senha com menos de 8 caracteres', async () => {
    app = await buildTestApp(
      createPrismaFake({
        user: { count: vi.fn(async () => 0) },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'admin@loja.com', password: '1234567' },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('retorna token quando as credenciais estão corretas', async () => {
    const hashed = await bcrypt.hash('senha-correta-123', 10)
    app = await buildTestApp(
      createPrismaFake({
        user: {
          findUnique: vi.fn(async () => ({ id: 'u1', email: 'admin@loja.com', password: hashed })),
        },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@loja.com', password: 'senha-correta-123' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().token).toBeTruthy()
  })

  it('retorna 401 com a mesma mensagem para email inexistente e senha errada', async () => {
    const hashed = await bcrypt.hash('senha-correta-123', 10)
    app = await buildTestApp(
      createPrismaFake({
        user: {
          findUnique: vi.fn(async ({ where }: any) =>
            where.email === 'admin@loja.com'
              ? { id: 'u1', email: 'admin@loja.com', password: hashed }
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
})
