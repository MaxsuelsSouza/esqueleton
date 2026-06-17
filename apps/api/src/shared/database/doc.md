# shared/database/ — Prisma + Tenant Guard

Conexão com o banco de dados e proteção multi-tenant.

## Arquivos

### `prisma.plugin.ts`

Plugin Fastify que registra dois decorators:

- **`app.prisma`** — cliente Prisma envolvido pelo tenant guard. Usado em **todas as rotas de loja** (admin e públicas). Qualquer query em modelo de loja sem `storeId` lança erro.
- **`app.prismaRaw`** — cliente Prisma sem proteção. Usado **apenas** em rotas super-admin e webhooks, que fazem queries cross-store.

**Injeção de dependência (testes):** aceita `{ client: PrismaClient }` nas opções. Quando recebe um client externo (fake), não chama `$connect`/`$disconnect` — o teste controla o ciclo de vida.

```typescript
// Em app.ts
app.register(prismaPlugin, { client: options.prisma })

// Em rotas de loja
const products = await app.prisma.product.findMany({ where: { storeId } })

// Em rotas super-admin
const allStores = await app.prismaRaw.store.findMany()
```

### `tenant-guard.ts`

Proxy que envolve o Prisma Client e **lança erro** se uma query em modelo de loja não incluir `storeId`.

**Modelos protegidos (14):** `product`, `productVariant`, `category`, `featured`, `promotion`, `coupon`, `storeProfile`, `order`, `customer`, `productEvent`, `notification`, `subscription`.

**O que verifica por operação:**

| Operação | Deve ter `storeId` em |
|----------|----------------------|
| `create` | `data` |
| `createMany` | cada item de `data` |
| `upsert` | `where` E `create` |
| `findMany`, `findFirst`, `count`, `update`, `updateMany`, `delete`, `deleteMany` | `where` |

**Unique compostas** (ex: `storeId_code`) são aceitas — o guard busca `storeId` recursivamente dentro do objeto `where`.

**`$transaction`** também é protegido — o callback recebe um proxy com as mesmas regras.

```typescript
// ✅ Correto — storeId presente
app.prisma.product.findMany({ where: { storeId } })
app.prisma.coupon.findUnique({ where: { storeId_code: { storeId, code } } })

// ❌ Erro em runtime — tenant guard lança exceção
app.prisma.product.findMany({ where: { id } })
```

**Exporta:** `comProtecaoDeLoja(prisma: PrismaClient): PrismaClient`

## Fluxo

```
app.ts registra prismaPlugin
  → cria PrismaClient (ou recebe fake nos testes)
  → envolve com comProtecaoDeLoja() → app.prisma
  → mantém original sem proteção → app.prismaRaw
  → ao fechar o app, desconecta ($disconnect)
```
