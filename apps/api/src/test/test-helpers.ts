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
  // Loja recém-criada: dentro do período de teste, o catálogo público responde
  createdAt: new Date(),
}

// Cria um banco de dados falso — cada teste configura apenas os métodos que usa.
// A tabela de lojas já vem configurada com a LOJA_TESTE (pode ser sobrescrita
// passando um "store" próprio em models).
export function createPrismaFake(models: Record<string, Record<string, (...args: unknown[]) => unknown>>): PrismaClient {
  const fake: Record<string, unknown> = {
    // O Prisma real tem $transaction nas duas formas: com função (recebe o banco
    // da transação) e com array de operações (executa todas). Aqui a função roda
    // com o próprio banco falso, e o array apenas aguarda as promessas.
    $transaction: async (fnOuLista: ((tx: unknown) => Promise<unknown>) | Promise<unknown>[]) =>
      typeof fnOuLista === 'function' ? fnOuLista(fake) : Promise.all(fnOuLista),
    // Resolve o slug das rotas públicas para a loja de teste
    store: {
      findUnique: async (args: unknown) => {
        const where = (args as { where?: { slug?: string; id?: string } })?.where
        if (where?.slug === LOJA_TESTE.slug || where?.id === LOJA_TESTE.id) return LOJA_TESTE
        return null
      },
    },
    // Sem assinatura = sem limites de plano — as rotas com checkPlanLimit passam direto.
    // Testes de limite podem sobrescrever passando um "subscription" próprio em models.
    subscription: {
      findFirst: async () => null,
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
// por padrão; informe outro storeId para simular um admin de outra loja.
// O terceiro parâmetro permite variar o papel (STAFF), o e-mail não verificado
// ou a flag de super-admin.
export async function createTestToken(
  app: Awaited<ReturnType<typeof buildTestApp>>,
  storeId: string = LOJA_TESTE.id,
  extras: { sub?: string; role?: string; emailVerified?: boolean; isSuperAdmin?: boolean } = {},
) {
  return app.jwt.sign({
    sub: extras.sub ?? 'usuario-teste',
    email: 'teste@teste.com',
    storeId,
    role: extras.role ?? 'OWNER',
    emailVerified: extras.emailVerified ?? true,
    isSuperAdmin: extras.isSuperAdmin ?? false,
  })
}
