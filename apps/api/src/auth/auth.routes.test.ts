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
    // O primeiro usuário da loja nasce como OWNER
    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'OWNER' }),
      })
    )
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
    // O novo usuário nasce na loja de quem criou — nunca em outra — e sempre como STAFF
    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ storeId: LOJA_TESTE.id, role: 'STAFF' }),
      })
    )
  })

  it('STAFF não pode convidar novos membros', async () => {
    const userCreate = vi.fn(async () => ({}))
    app = await buildTestApp(
      createPrismaFake({
        user: { findUnique: vi.fn(async () => null), create: userCreate },
      })
    )
    const token = await createTestToken(app, undefined, { role: 'STAFF' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'novo@loja.com', password: 'senha-segura-123' },
    })

    expect(response.statusCode).toBe(403)
    expect(userCreate).not.toHaveBeenCalled()
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

  it('retorna token, papel e os dados da loja quando as credenciais estão corretas', async () => {
    const hashed = await bcrypt.hash('senha-correta-123', 10)
    app = await buildTestApp(
      createPrismaFake({
        user: {
          findUnique: vi.fn(async () => ({
            id: 'u1', email: 'admin@loja.com', password: hashed, storeId: LOJA_TESTE.id,
            role: 'OWNER', emailVerified: true, isSuperAdmin: false,
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
    // O papel e a verificação voltam para o painel ajustar a interface
    expect(body.role).toBe('OWNER')
    expect(body.emailVerified).toBe(true)
    expect(body.isSuperAdmin).toBe(false)
    // O slug volta para o painel montar o link "ver minha loja"
    expect(body.store.slug).toBe(LOJA_TESTE.slug)
    // O token carrega a loja e o papel — é o que as rotas protegidas leem
    const payload = app.jwt.decode(body.token) as { storeId: string; role: string }
    expect(payload.storeId).toBe(LOJA_TESTE.id)
    expect(payload.role).toBe('OWNER')
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

  it('bloqueia ataque distribuído contra uma mesma conta (limite por email)', async () => {
    app = await buildTestApp(
      createPrismaFake({
        user: { findUnique: vi.fn(async () => null) },
      })
    )

    // 11 tentativas para o MESMO email, cada uma vinda de um IP DIFERENTE —
    // o limite por IP (10/minuto) não dispara, mas o por conta (10 em 15 min) sim
    let lastStatus = 0
    let lastMessage = ''
    for (let i = 0; i < 11; i++) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        // trustProxy está ligado — o IP do cliente vem do cabeçalho x-forwarded-for
        headers: { 'x-forwarded-for': `10.0.0.${i + 1}` },
        payload: { email: 'alvo@loja.com', password: `tentativa-${i}` },
      })
      lastStatus = response.statusCode
      lastMessage = response.json().message
    }

    expect(lastStatus).toBe(429)
    // A mensagem é a do limite por conta, não a do limite por IP
    expect(lastMessage).toContain('conta')
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
