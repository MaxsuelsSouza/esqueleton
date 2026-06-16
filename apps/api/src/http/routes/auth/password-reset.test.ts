// Testes do reset de senha — criação de token, expiração, uso único e token inválido
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp, LOJA_TESTE } from '../../../test/test-helpers'

type TestApp = Awaited<ReturnType<typeof buildTestApp>>

const USUARIO = { id: 'u1', storeId: LOJA_TESTE.id }

describe('POST /api/auth/forgot-password', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  it('cria o token de redefinição quando o e-mail existe', async () => {
    const tokenCreate = vi.fn(async () => ({}))
    app = await buildTestApp(
      createPrismaFake({
        user: { findUnique: vi.fn(async () => USUARIO) },
        passwordResetToken: { deleteMany: vi.fn(async () => ({})), create: tokenCreate },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'admin@loja.com' },
    })

    expect(response.statusCode).toBe(200)
    expect(tokenCreate).toHaveBeenCalled()
    // O token expira em ~1 hora
    const expiresAt = (tokenCreate.mock.calls[0][0] as { data: { expiresAt: Date } }).data.expiresAt
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 50 * 60 * 1000)
    expect(expiresAt.getTime()).toBeLessThan(Date.now() + 70 * 60 * 1000)
  })

  it('responde 200 com a mesma mensagem quando o e-mail não existe (não revela cadastros)', async () => {
    const tokenCreate = vi.fn(async () => ({}))
    app = await buildTestApp(
      createPrismaFake({
        user: { findUnique: vi.fn(async () => null) },
        passwordResetToken: { deleteMany: vi.fn(async () => ({})), create: tokenCreate },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'nao-existe@loja.com' },
    })

    expect(response.statusCode).toBe(200)
    // Nenhum token é criado para e-mail desconhecido
    expect(tokenCreate).not.toHaveBeenCalled()
  })
})

describe('POST /api/auth/reset-password', () => {
  let app: TestApp

  afterEach(async () => {
    await app?.close()
  })

  // Monta o app com um token de redefinição no estado desejado
  async function appComToken(token: {
    usedAt: Date | null
    expiresAt: Date
  }) {
    const userUpdate = vi.fn(async () => ({}))
    const tokenUpdate = vi.fn(async () => ({}))
    const builtApp = await buildTestApp(
      createPrismaFake({
        user: { update: userUpdate },
        passwordResetToken: {
          findUnique: vi.fn(async () => ({
            id: 'token1',
            userId: USUARIO.id,
            user: { id: USUARIO.id },
            ...token,
          })),
          update: tokenUpdate,
        },
      })
    )
    return { builtApp, userUpdate, tokenUpdate }
  }

  it('redefine a senha com token válido e marca o token como usado', async () => {
    const { builtApp, userUpdate, tokenUpdate } = await appComToken({
      usedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })
    app = builtApp

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token: 'a'.repeat(64), password: 'nova-senha-123' },
    })

    expect(response.statusCode).toBe(200)
    // A senha gravada é criptografada (nunca em texto puro)
    const novaSenha = (userUpdate.mock.calls[0][0] as { data: { password: string } }).data.password
    expect(novaSenha).not.toBe('nova-senha-123')
    expect(novaSenha.startsWith('$2')).toBe(true) // formato bcrypt
    // Token marcado como usado — não vale uma segunda vez
    expect(tokenUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ usedAt: expect.any(Date) }) })
    )
  })

  it('rejeita token expirado', async () => {
    const { builtApp, userUpdate } = await appComToken({
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    })
    app = builtApp

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token: 'a'.repeat(64), password: 'nova-senha-123' },
    })

    expect(response.statusCode).toBe(400)
    expect(userUpdate).not.toHaveBeenCalled()
  })

  it('rejeita token já usado', async () => {
    const { builtApp, userUpdate } = await appComToken({
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })
    app = builtApp

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token: 'a'.repeat(64), password: 'nova-senha-123' },
    })

    expect(response.statusCode).toBe(400)
    expect(userUpdate).not.toHaveBeenCalled()
  })

  it('rejeita token inexistente', async () => {
    app = await buildTestApp(
      createPrismaFake({
        passwordResetToken: { findUnique: vi.fn(async () => null) },
      })
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token: 'token-que-nao-existe', password: 'nova-senha-123' },
    })

    expect(response.statusCode).toBe(400)
  })
})
