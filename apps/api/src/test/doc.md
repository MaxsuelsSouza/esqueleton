# test/ — Helpers e testes de integração

Utilitários compartilhados por todos os testes da API. Permitem testar rotas sem banco de dados real.

## Arquivos

### `test-helpers.ts`

**Exports:**

| Export | O que faz |
|--------|-----------|
| `LOJA_TESTE` | Loja padrão dos testes (`id: 'loja-teste'`, `slug: 'loja-teste'`, `status: 'ACTIVE'`) |
| `createPrismaFake(models)` | Cria banco falso — só implementa os métodos usados pelo teste |
| `buildTestApp(prismaFake)` | Sobe o Fastify com o banco falso, pronto para `app.inject()` |
| `createTestToken(app, storeId?, extras?)` | Gera JWT válido para testar rotas protegidas |

### `LOJA_TESTE`

Loja usada em todos os testes. Rotas públicas resolvem o slug `loja-teste` e tokens pertencem a ela.

```typescript
const LOJA_TESTE = {
  id: 'loja-teste',
  slug: 'loja-teste',
  name: 'Loja Teste',
  status: 'ACTIVE',
  createdAt: new Date(), // dentro do trial
}
```

### `createPrismaFake(models)`

Cria um objeto que imita o PrismaClient. Vem com:
- `$transaction` — executa função com o próprio fake, ou `Promise.all` para arrays
- `store.findUnique` — resolve `LOJA_TESTE` pelo slug ou id
- `subscription.findFirst` — retorna `null` (sem limites de plano)

O teste sobrescreve apenas os métodos que precisa:

```typescript
const fake = createPrismaFake({
  product: {
    findMany: vi.fn(async () => [produto]),
    count: vi.fn(async () => 1),
  },
})
```

### `buildTestApp(prismaFake)`

Chama `buildApp({ prisma: fake })` e aguarda `app.ready()`. Retorna app pronto para `app.inject()`.

### `createTestToken(app, storeId?, extras?)`

Gera JWT com dados padrão (OWNER, email verificado, não super-admin). Customize com `extras`:

```typescript
// Token padrão (OWNER da LOJA_TESTE)
const token = await createTestToken(app)

// Token de STAFF
const token = await createTestToken(app, LOJA_TESTE.id, { role: 'STAFF' })

// Token de super-admin
const token = await createTestToken(app, LOJA_TESTE.id, { isSuperAdmin: true })

// Token de outra loja (para testar isolamento)
const token = await createTestToken(app, 'outra-loja')
```

### `tenant-isolation.test.ts`

Testes que verificam que uma loja não acessa dados de outra. Cria tokens de lojas diferentes e confirma 404 em operações cross-store.

## Padrão de um teste

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildTestApp, createPrismaFake, createTestToken, LOJA_TESTE } from '../../../test/test-helpers'

describe('GET /api/lojas/:slug/features', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>

  afterEach(async () => {
    await app?.close()
  })

  it('lista features da loja', async () => {
    const findMany = vi.fn(async () => [{ id: '1', storeId: LOJA_TESTE.id }])
    app = await buildTestApp(createPrismaFake({
      feature: { findMany, count: vi.fn(async () => 1) },
    }))

    const response = await app.inject({
      method: 'GET',
      url: '/api/lojas/loja-teste/features',
    })

    expect(response.statusCode).toBe(200)
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: LOJA_TESTE.id }),
      })
    )
  })

  it('requer auth na rota admin', async () => {
    app = await buildTestApp(createPrismaFake({}))
    const res = await app.inject({ method: 'GET', url: '/api/features' })
    expect(res.statusCode).toBe(401)
  })

  it('admin autenticado acessa', async () => {
    const findMany = vi.fn(async () => [])
    app = await buildTestApp(createPrismaFake({
      feature: { findMany, count: vi.fn(async () => 0) },
    }))
    const token = await createTestToken(app)

    const res = await app.inject({
      method: 'GET',
      url: '/api/features',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
  })
})
```

## Regras

- **Sempre feche o app** no `afterEach` (`await app?.close()`)
- **Use `vi.fn()`** para cada método Prisma — permite verificar args com `toHaveBeenCalledWith`
- **Verifique storeId** nos args do mock — confirma isolamento
- **Teste 401** para rotas admin sem token
- **Teste 404** para ownership violation (outro storeId)
- Testes ficam ao lado da rota: `<feature>.routes.test.ts`
