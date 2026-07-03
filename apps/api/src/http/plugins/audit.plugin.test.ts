// Testes do log de auditoria (LGPD, Fase 4.1) — verifica que ações sensíveis
// geram registro e que uma falha na auditoria nunca quebra a requisição.
import { describe, it, expect, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { createPrismaFake, buildTestApp, LOJA_TESTE } from '../../test/test-helpers'

const SENHA = 'senha-correta-123'

// Usuário de teste com hash real — o login compara com bcrypt
async function createUsuario() {
  return {
    id: 'usuario-1',
    email: 'dono@teste.com',
    password: await bcrypt.hash(SENHA, 4),
    storeId: LOJA_TESTE.id,
    role: 'OWNER',
    emailVerified: true,
    isSuperAdmin: false,
    mustChangePassword: false,
  }
}

describe('auditoria de ações sensíveis', () => {
  it('grava LOGIN com loja, usuário e IP no login bem-sucedido', async () => {
    // Arrange
    const auditCreate = vi.fn().mockResolvedValue({})
    const usuario = await createUsuario()
    const prisma = createPrismaFake({
      user: { findUnique: async () => usuario },
      auditLog: { create: auditCreate },
    })
    const app = await buildTestApp(prisma)

    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: usuario.email, password: SENHA },
    })

    // Assert — o registro é fire-and-forget, aguarda o microtask
    expect(response.statusCode).toBe(200)
    await vi.waitFor(() => expect(auditCreate).toHaveBeenCalled())
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'LOGIN',
        storeId: LOJA_TESTE.id,
        userId: usuario.id,
        ip: expect.any(String),
      }),
    })
    await app.close()
  })

  it('grava LOGIN_FALHOU quando a senha está incorreta', async () => {
    // Arrange
    const auditCreate = vi.fn().mockResolvedValue({})
    const usuario = await createUsuario()
    const prisma = createPrismaFake({
      user: { findUnique: async () => usuario },
      auditLog: { create: auditCreate },
    })
    const app = await buildTestApp(prisma)

    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: usuario.email, password: 'senha-errada' },
    })

    // Assert
    expect(response.statusCode).toBe(401)
    await vi.waitFor(() => expect(auditCreate).toHaveBeenCalled())
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'LOGIN_FALHOU', userId: usuario.id }),
    })
    await app.close()
  })

  it('não quebra a requisição quando a gravação da auditoria falha', async () => {
    // Arrange — auditLog.create explode; o login precisa continuar funcionando
    const usuario = await createUsuario()
    const prisma = createPrismaFake({
      user: { findUnique: async () => usuario },
      auditLog: {
        create: async () => {
          throw new Error('banco indisponível')
        },
      },
    })
    const app = await buildTestApp(prisma)

    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: usuario.email, password: SENHA },
    })

    // Assert — a falha foi engolida pelo fire-and-forget
    expect(response.statusCode).toBe(200)
    expect(response.json().token).toBeTruthy()
    await app.close()
  })

  it('não quebra nem quando o banco falso não tem a tabela de auditoria', async () => {
    // Arrange — fakes antigos não configuram auditLog: o acesso lança erro síncrono
    const usuario = await createUsuario()
    const prisma = createPrismaFake({
      user: { findUnique: async () => usuario },
    })
    const app = await buildTestApp(prisma)

    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: usuario.email, password: SENHA },
    })

    // Assert
    expect(response.statusCode).toBe(200)
    await app.close()
  })
})
