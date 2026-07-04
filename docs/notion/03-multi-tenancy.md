# 03 — Multi-tenancy

[← Voltar ao início](00-inicio.md)

O multi-tenancy é **o coração do Esqueleton**: várias lojas no mesmo banco, com garantia de que uma loja jamais enxerga dados de outra.

## O modelo

- A entidade `Store` é o **tenant**: `slug` único, `name`, `status` (`ACTIVE`/`SUSPENDED`).
- **Todo modelo de dados de loja** tem coluna `storeId` obrigatória (com índice) apontando para `Store`. Apagar uma loja apaga tudo dela em cascata.
- Exceções (entidades globais, sem `storeId`): `User`* , `Store`, `ProductCategory` (junção), `PasswordResetToken`, `EmailVerificationToken`, `Plan`.

\* `User` pertence a uma loja, mas o login é por e-mail global — por isso ele é exempto do tenant guard.

## Como cada tipo de request é isolado

### Requests admin (painel)

O JWT carrega `storeId` no payload. **Toda query** filtra por `request.user.storeId`:

```ts
const products = await prisma.product.findMany({
  where: { storeId: request.user.storeId },
})
```

### Requests públicos (catálogo)

Rotas vivem sob `/api/lojas/:slug/...`. O preHandler `resolveStore` (`http/plugins/store-context.plugin.ts`):

1. Resolve o slug → loja (com **cache em memória de 60s**).
2. Anexa `request.store`.
3. Loja inexistente ou `SUSPENDED` → **404 "Loja não encontrada"**.
4. Loja fora do trial e sem assinatura ativa → **503 genérico** (ver [Billing](08-billing.md)).

## O tenant guard

`shared/database/tenant-guard.ts` envolve o cliente Prisma (o real **e** os fakes de teste) e **lança erro** quando uma query em modelo de loja não declara `storeId`:

- Leituras, updates e deletes: `storeId` precisa estar no `where`.
- Creates: `storeId` precisa estar no `data`.
- Ele **nunca injeta o filtro automaticamente** — as rotas precisam ser explícitas. Um esquecimento vira erro imediato em dev/teste, não um vazamento silencioso em produção.

## Uniques compostos por loja

Unicidade é sempre **por loja**, nunca global:

| Modelo | Unique |
|--------|--------|
| `Coupon` | `@@unique([storeId, code])` |
| `Customer` | `@@unique([storeId, phone])` |
| `Order` | `@@unique([storeId, orderNumber])` |
| `Notification` | `@@unique([storeId, type, entityId])` |

Nos lookups Prisma usa-se a chave composta: `where: { storeId_code: { storeId, code } }`.

## Padrão de ownership em update/delete

Para atualizar/apagar por id sem risco de atingir outra loja:

```ts
const { count } = await prisma.product.deleteMany({
  where: { id, storeId },   // id E storeId
})
if (count === 0) return reply.status(404).send(...)
```

## Disponibilidade da loja ("pagou, usou")

O catálogo público de uma loja só funciona:

- Durante o **trial de 7 dias** (contado de `Store.createdAt` — `domain/billing/trial.ts`), **ou**
- Com uma assinatura **ACTIVE**.

Fora disso, `resolveStore` responde **503 "Ops! Aconteceu um erro..."** — um erro deliberadamente genérico para que o cliente final nunca descubra que é questão de cobrança. O painel admin permanece acessível para o dono assinar.

## Subdomínio por loja

`meu-slug.plataforma.com` funciona via middleware Next.js que reescreve internamente para `/loja/meu-slug` — detalhes em [12 — Frontend Web](12-frontend-web.md).

## Testes de isolamento

- `apps/api/src/test/tenant-isolation.test.ts` — garante que uma loja não lê/escreve dados da outra.
- `shared/database/tenant-guard.test.ts` — testes unitários do guard.

## Regra para novas features

Ao criar um modelo novo que pertence a uma loja:

1. Adicionar `storeId` obrigatório + relação + índice no `schema.prisma`.
2. Filtrar **todas** as queries por `storeId` (o guard lança se esquecer).
3. Exportar `<feature>PublicRoutes` (usa `request.store!.id`) e `<feature>AdminRoutes` (usa `request.user.storeId`).

## Próxima página

→ [04 — Autenticação e Usuários](04-autenticacao-e-usuarios.md)
