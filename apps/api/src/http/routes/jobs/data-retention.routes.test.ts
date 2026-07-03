// Testes do job de retenção de dados (LGPD) — GET /api/jobs/limpeza-lgpd
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPrismaFake, buildTestApp } from '../../../test/test-helpers'

// Banco falso com todas as tabelas que a limpeza toca — cada método devolve
// a contagem e guarda o filtro recebido para as verificações
function createRetentionPrismaFake() {
  const chamadas: Record<string, unknown> = {}
  const prisma = createPrismaFake({
    passwordResetToken: {
      deleteMany: async (args: unknown) => {
        chamadas.passwordResetToken = args
        return { count: 2 }
      },
    },
    emailVerificationToken: {
      deleteMany: async (args: unknown) => {
        chamadas.emailVerificationToken = args
        return { count: 1 }
      },
    },
    notification: {
      deleteMany: async (args: unknown) => {
        chamadas.notification = args
        return { count: 5 }
      },
    },
    order: {
      updateMany: async (args: unknown) => {
        chamadas.order = args
        return { count: 3 }
      },
    },
    customer: {
      deleteMany: async (args: unknown) => {
        chamadas.customer = args
        return { count: 4 }
      },
    },
    productEvent: {
      deleteMany: async (args: unknown) => {
        chamadas.productEvent = args
        return { count: 100 }
      },
    },
  })
  return { prisma, chamadas }
}

describe('GET /api/jobs/limpeza-lgpd', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', '')
    vi.stubEnv('NODE_ENV', 'test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('executa a limpeza e devolve as contagens de cada etapa', async () => {
    // Arrange
    const { prisma } = createRetentionPrismaFake()
    const app = await buildTestApp(prisma)

    // Act
    const response = await app.inject({ method: 'GET', url: '/api/jobs/limpeza-lgpd' })

    // Assert
    expect(response.statusCode).toBe(200)
    expect(response.json().resultado).toEqual({
      tokensReset: 2,
      tokensVerificacao: 1,
      notificacoes: 5,
      pedidosAnonimizados: 3,
      clientesEliminados: 4,
      eventos: 100,
    })
    await app.close()
  })

  it('anonimiza pedidos (não apaga) e só toca nos que ainda têm dado pessoal', async () => {
    // Arrange
    const { prisma, chamadas } = createRetentionPrismaFake()
    const app = await buildTestApp(prisma)

    // Act
    await app.inject({ method: 'GET', url: '/api/jobs/limpeza-lgpd' })

    // Assert — updateMany zera nome/telefone mantendo o pedido
    const pedido = chamadas.order as {
      where: { createdAt: { lt: Date }; OR: unknown[] }
      data: { customerName: null; customerPhone: null }
    }
    expect(pedido.data).toEqual({ customerName: null, customerPhone: null })
    expect(pedido.where.createdAt.lt).toBeInstanceOf(Date)
    expect(pedido.where.OR).toHaveLength(2)
    await app.close()
  })

  it('apaga tokens usados ou expirados há mais de 24h', async () => {
    // Arrange
    const { prisma, chamadas } = createRetentionPrismaFake()
    const app = await buildTestApp(prisma)

    // Act
    await app.inject({ method: 'GET', url: '/api/jobs/limpeza-lgpd' })

    // Assert — filtro cobre os dois casos: usado (usedAt) ou expirado (expiresAt)
    const filtro = (chamadas.passwordResetToken as { where: { OR: unknown[] } }).where
    expect(filtro.OR).toEqual([
      { usedAt: { not: null } },
      { expiresAt: { lt: expect.any(Date) } },
    ])
    expect(chamadas.emailVerificationToken).toEqual(chamadas.passwordResetToken)
    await app.close()
  })

  it('recusa a requisição sem o segredo quando CRON_SECRET está configurado', async () => {
    // Arrange
    vi.stubEnv('CRON_SECRET', 'segredo-do-cron')
    const { prisma, chamadas } = createRetentionPrismaFake()
    const app = await buildTestApp(prisma)

    // Act
    const semSegredo = await app.inject({ method: 'GET', url: '/api/jobs/limpeza-lgpd' })
    const segredoErrado = await app.inject({
      method: 'GET',
      url: '/api/jobs/limpeza-lgpd',
      headers: { authorization: 'Bearer segredo-errado' },
    })

    // Assert — nada foi apagado
    expect(semSegredo.statusCode).toBe(401)
    expect(segredoErrado.statusCode).toBe(401)
    expect(chamadas.passwordResetToken).toBeUndefined()
    await app.close()
  })

  it('aceita a requisição com o segredo correto', async () => {
    // Arrange
    vi.stubEnv('CRON_SECRET', 'segredo-do-cron')
    const { prisma } = createRetentionPrismaFake()
    const app = await buildTestApp(prisma)

    // Act
    const response = await app.inject({
      method: 'GET',
      url: '/api/jobs/limpeza-lgpd',
      headers: { authorization: 'Bearer segredo-do-cron' },
    })

    // Assert
    expect(response.statusCode).toBe(200)
    await app.close()
  })

  it('fica desativado em produção sem CRON_SECRET configurado', async () => {
    // Arrange — em produção a API exige JWT_SECRET e as credenciais R2 para subir
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('JWT_SECRET', 'segredo-de-teste')
    vi.stubEnv('R2_ACCOUNT_ID', 'conta-teste')
    vi.stubEnv('R2_ACCESS_KEY_ID', 'chave-teste')
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'segredo-teste')
    vi.stubEnv('R2_BUCKET_NAME', 'bucket-teste')
    vi.stubEnv('R2_PUBLIC_URL', 'https://img.teste.com')
    const { prisma, chamadas } = createRetentionPrismaFake()
    const app = await buildTestApp(prisma)

    // Act
    const response = await app.inject({ method: 'GET', url: '/api/jobs/limpeza-lgpd' })

    // Assert — rota responde 503 e nada foi apagado
    expect(response.statusCode).toBe(503)
    expect(chamadas.passwordResetToken).toBeUndefined()
    await app.close()
  })
})
