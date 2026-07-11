# CLAUDE.md — Backend (apps/api)

Guia para Claude Code construir código que segue os padrões desta API.

## Arquitetura em camadas

```
src/
  app.ts               # fábrica do servidor — registra plugins e rotas
  main.ts              # inicia o servidor (porta 3001)
  vercel.ts            # entrada serverless

  shared/              # infraestrutura transversal (sem lógica de negócio)
    database/          # Prisma client + tenant guard
    email/             # integração Resend
    validation/        # validadores Zod reutilizáveis
    errors/            # error handler global
    cache/             # Redis para rate limiting

  domain/              # lógica de negócio PURA — sem HTTP, sem Fastify
    <feature>/
      services/        # funções que recebem Prisma + dados validados
      guards/          # preHandlers de permissão (role, email, super-admin)
      integrations/    # adaptadores externos (Stripe)

  http/                # camada HTTP — depende do Fastify
    plugins/           # extensões do Fastify (jwt, store-context, plan-limits, session)
    schemas/           # validações Zod de entrada (request body/params/query)
    routes/            # handlers agrupados por feature
      <feature>/
        <feature>.routes.ts
        index.ts       # barrel export

  test/
    test-helpers.ts    # createPrismaFake, buildTestApp, createTestToken
```

**Regra de dependência:** `routes → schemas + domain services` | `domain → shared` | `shared → nada`.
Nunca importe de `http/` dentro de `domain/` ou `shared/`.

## Convenções de nomenclatura

| Tipo | Nome do arquivo | Exports |
|------|----------------|---------|
| Rotas | `<feature>.routes.ts` | `<feature>PublicRoutes`, `<feature>AdminRoutes` |
| Schema | `<feature>.schema.ts` | `<feature>Schema`, `type <Feature>Input` |
| Service | `<feature>.service.ts` | funções nomeadas (sem default export) |
| Guard | `<role>.guard.ts` | `require<Role>` |
| Plugin | `<name>.plugin.ts` | `<name>Plugin` |
| Barrel | `index.ts` | re-exporta tudo da pasta |

Variáveis e funções usam nomes descritivos por extenso (`productList`, não `pl`). Comentários em português quando a lógica não é óbvia.

## Como criar uma feature nova

### 1. Schema (`http/schemas/<feature>.schema.ts`)

```typescript
import { z } from 'zod'
import { idSchema, idParamSchema, shortText, imageUrlSchema } from '../../shared/validation/schemas'

export const featureSchema = z.object({
  name: shortText(200, 'Nome é obrigatório'),
  description: shortText(2000).nullish().transform(v => v || undefined),
  // campos opcionais: .nullish().transform(v => v || undefined)
  // imagem: imageUrlSchema.or(z.literal('')).or(z.null()).optional().transform(v => v || undefined)
})

export type FeatureInput = z.infer<typeof featureSchema>
```

- Sempre use os validadores de `shared/validation/schemas.ts` para IDs, datas, cores, URLs, telefones e textos curtos.
- Mensagens de erro em português: `'Nome é obrigatório'`, `'Preço deve ser maior que zero'`.
- Use `.transform(v => v || undefined)` para converter null/empty em undefined antes do Prisma.

### 2. Service (`domain/<feature>/services/<feature>.service.ts`)

```typescript
import type { PrismaClient } from '@prisma/client'

// Constante de include reutilizável
export const FEATURE_INCLUDE = {
  relation: { select: { id: true, name: true } },
} as const

// Transformação banco → resposta
export function toFeatureResponse(item: DatabaseType) {
  const { internalField, ...rest } = item
  return { ...rest, publicField: transform(internalField) }
}

// Listagem com paginação
export async function listarFeatures(prisma: PrismaClient, storeId: string, query: ListQuery) {
  const page = Math.max(1, Math.floor(Number(query.page) || 1))
  const pageSize = Math.min(Math.max(1, Math.floor(Number(query.pageSize) || 20)), 500)

  const where = { storeId }
  const [items, total] = await Promise.all([
    prisma.feature.findMany({ where, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.feature.count({ where }),
  ])

  return { data: items.map(toFeatureResponse), total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

// Validação pura (sem banco)
export function validateFeatureRule(data: Input): boolean {
  return /* lógica pura */
}
```

- **Sem HTTP, sem Fastify** — recebe `PrismaClient` e dados já validados.
- Paginação padrão: `page` default 1, `pageSize` default 20, máximo 500.
- Use `Promise.all` para consultas independentes.

### 3. Rotas (`http/routes/<feature>/<feature>.routes.ts`)

```typescript
import type { FastifyPluginAsync } from 'fastify'
import { featureSchema } from '../../schemas/feature.schema'
import { idParamSchema } from '../../../shared/validation/schemas'
import { listarFeatures, toFeatureResponse, FEATURE_INCLUDE } from '../../../domain/<feature>/services/feature.service'

// ── Rotas públicas (slug na URL → request.store) ──
export const featurePublicRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request) => {
    return listarFeatures(app.prisma, request.store!.id, request.query as any)
  })

  app.get('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const item = await app.prisma.feature.findFirst({
      where: { id, storeId: request.store!.id },
    })
    if (!item) return reply.status(404).send({ message: 'Recurso não encontrado' })
    return toFeatureResponse(item)
  })
}

// ── Rotas admin (JWT → request.user.storeId) ──
export const featureAdminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate)

  app.get('/', async (request) => {
    return listarFeatures(app.prisma, request.user.storeId, request.query as any)
  })

  app.post('/', async (request, reply) => {
    const storeId = request.user.storeId
    const data = featureSchema.parse(request.body)

    const item = await app.prisma.feature.create({
      data: { ...data, storeId },
    })
    return reply.status(201).send(toFeatureResponse(item))
  })

  app.put('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const storeId = request.user.storeId
    const data = featureSchema.partial().parse(request.body)

    const { count } = await app.prisma.feature.updateMany({
      where: { id, storeId },
      data,
    })
    if (count === 0) return reply.status(404).send({ message: 'Recurso não encontrado' })

    const updated = await app.prisma.feature.findFirst({ where: { id, storeId } })
    return toFeatureResponse(updated!)
  })

  app.delete('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const { count } = await app.prisma.feature.deleteMany({
      where: { id, storeId: request.user.storeId },
    })
    if (count === 0) return reply.status(404).send({ message: 'Recurso não encontrado' })
    return reply.status(204).send()
  })
}
```

### 4. Barrel (`http/routes/<feature>/index.ts`)

```typescript
export { featurePublicRoutes, featureAdminRoutes } from './feature.routes'
```

### 5. Registrar em `app.ts`

```typescript
// Import
import { featurePublicRoutes, featureAdminRoutes } from './http/routes/<feature>'

// Dentro do bloco público (com resolveStore)
publicApp.register(featurePublicRoutes, { prefix: '/features' })

// Admin
app.register(featureAdminRoutes, { prefix: '/api/features' })
```

### 6. Testes (`http/routes/<feature>/<feature>.routes.test.ts`)

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildTestApp, createPrismaFake, createTestToken, LOJA_TESTE } from '../../../test/test-helpers'

describe('GET /api/lojas/:slug/features', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>

  afterEach(async () => { await app?.close() })

  it('lista features da loja', async () => {
    const findMany = vi.fn(async () => [{ id: '1', name: 'Teste', storeId: LOJA_TESTE.id }])
    app = await buildTestApp(createPrismaFake({
      feature: { findMany, count: vi.fn(async () => 1) },
    }))

    const response = await app.inject({
      method: 'GET',
      url: '/api/lojas/loja-teste/features',
    })

    expect(response.statusCode).toBe(200)
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ storeId: LOJA_TESTE.id }) })
    )
  })

  it('requer autenticação na rota admin', async () => {
    app = await buildTestApp(createPrismaFake({}))

    const response = await app.inject({
      method: 'GET',
      url: '/api/features',
    })

    expect(response.statusCode).toBe(401)
  })
})
```

- Testes usam `buildTestApp` + `createPrismaFake` — sem banco real.
- `vi.fn()` para cada método Prisma usado na rota.
- Sempre feche o app no `afterEach`.

## Padrões obrigatórios

### Multi-tenancy (tenant guard)

Todo modelo com `storeId` é protegido pelo tenant guard. **Toda** query deve incluir `storeId` explicitamente:

```typescript
// ✅ Correto
app.prisma.product.findMany({ where: { storeId } })
app.prisma.product.create({ data: { ...fields, storeId } })
app.prisma.product.updateMany({ where: { id, storeId }, data })
app.prisma.product.deleteMany({ where: { id, storeId } })

// ❌ Errado — o tenant guard VAI lançar erro
app.prisma.product.findMany({ where: { id } })
app.prisma.product.delete({ where: { id } })
```

**Ownership pattern** para update/delete: use `updateMany`/`deleteMany` com `{ id, storeId }` e trate `count === 0` como 404.

**Unique compostas:** use a sintaxe `storeId_<field>`:
```typescript
app.prisma.coupon.findUnique({ where: { storeId_code: { storeId, code } } })
```

**Super-admin** usa `app.prismaRaw` (sem tenant guard) — nunca use `prismaRaw` em rotas de loja.

### Fontes de storeId

| Contexto | Fonte |
|----------|-------|
| Rota pública (`/api/lojas/:slug/...`) | `request.store!.id` |
| Rota admin (JWT) | `request.user.storeId` |
| Rota super-admin | query direta com `app.prismaRaw` |

### Validação

- **Sempre** parse o body/params/query com Zod antes de usar: `featureSchema.parse(request.body)`.
- Params: `idParamSchema.parse(request.params)`.
- PUT/PATCH: `featureSchema.partial().parse(request.body)`.
- Reutilize `idSchema`, `dateSchema`, `timeSchema`, `hexColorSchema`, `httpUrlSchema`, `imageUrlSchema`, `phoneSchema`, `shortText` de `shared/validation/schemas.ts`.

### Códigos de resposta

| Código | Quando |
|--------|--------|
| 200 | Sucesso (GET, PUT) |
| 201 | Recurso criado (POST) |
| 204 | Recurso deletado (DELETE) |
| 400 | Validação / regra de negócio violada |
| 401 | JWT ausente ou inválido |
| 403 | Permissão insuficiente / limite do plano / e-mail não verificado |
| 404 | Não encontrado / ownership violation |
| 409 | Duplicata (slug, código, e-mail) |
| 429 | Rate limit excedido |

### Formato de resposta

```typescript
// Erro
{ message: 'Descrição em português' }
{ message: 'Dados inválidos', errors: [...] }  // ZodError

// Sucesso com lista
{ data: [...], total, page, pageSize, totalPages }

// Sucesso com item
{ id, name, ... }  // objeto direto, sem wrapper
```

### Permissões (preHandlers)

```typescript
// Toda rota admin precisa de autenticação
app.addHook('preHandler', app.authenticate)

// Rotas só para OWNER
app.put('/', { preHandler: [requireOwner] }, handler)

// Limite de plano
app.post('/', { preHandler: [app.checkPlanLimit('maxProducts')] }, handler)

// Rate limit por rota
app.post('/', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, handler)
```

### Fire-and-forget

Operações que não devem bloquear a resposta:
```typescript
app.prisma.notification.create({ data: { ... } }).catch(() => {})
```

### Erros 5xx

O error handler mascara erros internos — sempre retorna `"Erro interno do servidor"`. Não exponha stack traces ou detalhes do banco.

## Modelo Prisma (checklist para novo modelo)

1. Adicione `storeId String` + `store Store @relation(...)` + `@@index([storeId])` ao modelo.
2. Se tiver unique por loja, use `@@unique([storeId, <campo>])`.
3. Rode `pnpm --filter @esqueleton/api db:migrate`.
4. Adicione o nome do modelo (lowercase) ao set `MODELOS_DE_LOJA` em `shared/database/tenant-guard.ts`.
5. Adicione o tipo ao `packages/shared/src/index.ts`.

## Plugins disponíveis (decorators do Fastify)

| Decorator | Plugin | Disponível em |
|-----------|--------|---------------|
| `app.prisma` | prismaPlugin | toda rota |
| `app.prismaRaw` | prismaPlugin | super-admin e webhooks apenas |
| `app.authenticate` | jwtAuthPlugin | preHandler para rotas admin |
| `request.user` | jwtAuthPlugin | após `app.authenticate` |
| `app.resolveStore` | storeContextPlugin | preHandler para rotas públicas |
| `request.store` | storeContextPlugin | após `resolveStore` |
| `app.checkPlanLimit(key)` | planLimitsPlugin | preHandler |
| `app.planLimitStatus(storeId, key)` | planLimitsPlugin | qualquer rota |
| `app.email.send(...)` | resendPlugin | qualquer rota |
| `app.storage` | r2Plugin | rotas que fazem upload (null em dev sem R2) |
| `app.stripe` | stripePlugin | rotas de billing |
| `app.sessionStore` | sessionPlugin | rotas de sessão |
| `app.rateLimit(options)` | @fastify/rate-limit | preHandler por rota |

## Ordem de registro em app.ts

1. helmet → cors → rateLimit
2. prismaPlugin → jwtAuthPlugin → resendPlugin → r2Plugin
3. storeContextPlugin → stripePlugin → planLimitsPlugin → sessionPlugin
4. Rotas: auth → billing → webhooks → super → públicas (com resolveStore) → admin
5. Health check → error handler

Não altere esta ordem — plugins dependem de decorators registrados anteriormente.
