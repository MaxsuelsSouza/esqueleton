// Testes da verificação de e-mail — verificar, reenviar e o bloqueio após 7 dias
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, createTestToken } from '../../../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

const UM_DIA = 24 * 60 * 60 * 1000

describe('POST /api/auth/verify-email', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('marca o e-mail como verificado com token válido', async () => {
    const userUpdate = vi.fn(async () => ({}))
    app = await buildTestApp(
      createPrismaFake({
        user: { update: userUpdate },
        emailVerificationToken: {
          findUnique: vi.fn(async () => ({
            id: 'token1',
            userId: 'u1',
            expiresAt: new Date(Date.now() + UM_DIA),
            usedAt: null,
            // A rota usa a loja do usuário para criar o lembrete de assinatura
            user: { storeId: 'loja-teste' },
          })),
          update: vi.fn(async () => ({})),
        },
        // Lembrete de ativação criado após a verificação (fire and forget)
        notification: { upsert: vi.fn(async () => ({})) },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-email',
      payload: { token: 'a'.repeat(64) },
    })

    expect(response.statusCode).toBe(200)
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { emailVerified: true } })
    )
  })

  it('rejeita token expirado', async () => {
    app = await buildTestApp(
      createPrismaFake({
        emailVerificationToken: {
          findUnique: vi.fn(async () => ({
            id: 'token1',
            userId: 'u1',
            expiresAt: new Date(Date.now() - 1000),
            usedAt: null,
          })),
        },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-email',
      payload: { token: 'a'.repeat(64) },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('POST /api/auth/resend-verification', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('cria um novo token e responde 200 quando o e-mail ainda não foi verificado', async () => {
    const tokenCreate = vi.fn(async () => ({}))
    app = await buildTestApp(
      createPrismaFake({
        user: { findUnique: vi.fn(async () => ({ id: 'u1', email: 'a@a.com', storeId: 'loja-teste' })) },
        emailVerificationToken: { deleteMany: vi.fn(async () => ({})), create: tokenCreate },
      })
    )
    // Token de quem ainda não verificou o e-mail
    const token = await createTestToken(app, undefined, { emailVerified: false })

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/resend-verification',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(tokenCreate).toHaveBeenCalled()
  })

  it('responde 400 quando o e-mail já está verificado', async () => {
    app = await buildTestApp(createPrismaFake({}))
    const token = await createTestToken(app) // emailVerified: true por padrão

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/resend-verification',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('bloqueio do painel após 7 dias sem verificar o e-mail', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  // Monta o app com um usuário criado há N dias e e-mail não verificado
  async function appComUsuarioCriadoHa(dias: number) {
    return buildTestApp(
      createPrismaFake({
        user: {
          findUnique: vi.fn(async () => ({ createdAt: new Date(Date.now() - dias * UM_DIA) })),
        },
        product: { findMany: vi.fn(async () => []), count: vi.fn(async () => 0) },
      })
    )
  }

  it('bloqueia rotas do admin após 7 dias', async () => {
    app = await appComUsuarioCriadoHa(8)
    const token = await createTestToken(app, undefined, { emailVerified: false })

    const response = await app.inject({
      method: 'GET',
      url: '/api/products',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(403)
  })

  it('permite acesso dentro do período de tolerância', async () => {
    app = await appComUsuarioCriadoHa(2)
    const token = await createTestToken(app, undefined, { emailVerified: false })

    const response = await app.inject({
      method: 'GET',
      url: '/api/products',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
  })

  it('o reenvio do link continua acessível mesmo após o bloqueio', async () => {
    const tokenCreate = vi.fn(async () => ({}))
    app = await buildTestApp(
      createPrismaFake({
        user: {
          findUnique: vi.fn(async () => ({
            id: 'u1',
            email: 'a@a.com',
            storeId: 'loja-teste',
            createdAt: new Date(Date.now() - 10 * UM_DIA),
          })),
        },
        emailVerificationToken: { deleteMany: vi.fn(async () => ({})), create: tokenCreate },
      })
    )
    const token = await createTestToken(app, undefined, { emailVerified: false })

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/resend-verification',
      headers: { authorization: `Bearer ${token}` },
    })

    // Sem isso o usuário ficaria trancado para sempre — a rota é a saída do bloqueio
    expect(response.statusCode).toBe(200)
    expect(tokenCreate).toHaveBeenCalled()
  })
})
