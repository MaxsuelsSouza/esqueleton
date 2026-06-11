// Utilitários compartilhados pelos testes da API
// Permitem subir o servidor com um banco de dados falso, sem precisar de PostgreSQL
import type { PrismaClient } from '@prisma/client'
import { buildApp } from '../app'

// Cria um banco de dados falso — cada teste configura apenas os métodos que usa.
// Qualquer método não configurado devolve uma função vazia para não quebrar o teste.
export function createPrismaFake(models: Record<string, Record<string, (...args: unknown[]) => unknown>>): PrismaClient {
  const fake: Record<string, unknown> = {
    // O Prisma real tem $transaction — aqui apenas executa a função recebida com o próprio banco falso
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(fake),
    ...models,
  }
  return fake as unknown as PrismaClient
}

// Sobe o app pronto para receber requisições de teste via app.inject()
export async function buildTestApp(prismaFake: PrismaClient) {
  const app = buildApp({ prisma: prismaFake })
  await app.ready()
  return app
}

// Gera um token JWT válido para testar rotas protegidas
export async function createTestToken(app: Awaited<ReturnType<typeof buildTestApp>>) {
  return app.jwt.sign({ sub: 'usuario-teste', email: 'teste@teste.com' })
}
