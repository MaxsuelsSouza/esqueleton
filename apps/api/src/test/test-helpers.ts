// Utilitários compartilhados pelos testes da API
// Permitem subir o servidor com um banco de dados falso, sem precisar de PostgreSQL
import type { PrismaClient } from '@prisma/client'
import { buildApp } from '../app'

// Loja usada nos testes — as rotas públicas resolvem o slug "loja-teste"
// e os tokens de teste pertencem a ela por padrão
export const LOJA_TESTE = {
  id: 'loja-teste',
  slug: 'loja-teste',
  name: 'Loja Teste',
  status: 'ACTIVE',
}

// Cria um banco de dados falso — cada teste configura apenas os métodos que usa.
// A tabela de lojas já vem configurada com a LOJA_TESTE (pode ser sobrescrita
// passando um "store" próprio em models).
export function createPrismaFake(models: Record<string, Record<string, (...args: unknown[]) => unknown>>): PrismaClient {
  const fake: Record<string, unknown> = {
    // O Prisma real tem $transaction — aqui apenas executa a função recebida com o próprio banco falso
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(fake),
    // Resolve o slug das rotas públicas para a loja de teste
    store: {
      findUnique: async (args: unknown) => {
        const where = (args as { where?: { slug?: string; id?: string } })?.where
        if (where?.slug === LOJA_TESTE.slug || where?.id === LOJA_TESTE.id) return LOJA_TESTE
        return null
      },
    },
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

// Gera um token JWT válido para testar rotas protegidas — pertence à LOJA_TESTE
// por padrão; informe outro storeId para simular um admin de outra loja
export async function createTestToken(
  app: Awaited<ReturnType<typeof buildTestApp>>,
  storeId: string = LOJA_TESTE.id,
) {
  return app.jwt.sign({ sub: 'usuario-teste', email: 'teste@teste.com', storeId, role: 'OWNER', emailVerified: true })
}
