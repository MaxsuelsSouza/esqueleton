# apps/api/src/ — Código-fonte da API

Ponto de entrada e estrutura em três camadas.

## Arquivos da raiz

### `main.ts`

Ponto de entrada para execução local. Importa `buildApp()` e inicia o servidor Fastify na porta definida por `PORT` (padrão 3001).

```
node dist/main.js  →  Fastify escutando em 0.0.0.0:3001
```

### `app.ts`

Fábrica do servidor — **o arquivo mais importante da API**. Monta o Fastify completo:

1. Configura `helmet`, `cors`, `rateLimit`
2. Registra plugins: `prisma` → `jwt` → `resend` → `storeContext` → `stripe` → `planLimits` → `session`
3. Registra rotas: `auth` → `billing` → `webhooks` → `super` → públicas (com `resolveStore`) → admin
4. Health check (`GET /api/health`)
5. Error handler

**Injeção de dependência:** aceita `{ prisma: PrismaClient }` — usado nos testes para injetar um banco falso.

```typescript
// Produção
const app = buildApp()

// Testes
const app = buildApp({ prisma: fakePrisma })
```

### `vercel.ts`

Entrada serverless para deploy na Vercel. Importa `buildApp()`, aguarda `app.ready()` e emite a requisição no servidor HTTP do Fastify.

## Camadas

```
src/
  shared/    → infraestrutura (banco, email, validação, erros, cache)
  domain/    → lógica de negócio pura (sem HTTP)
  http/      → plugins Fastify, schemas Zod, rotas HTTP
  test/      → helpers e testes de integração
```

**Regra de dependência:** `http/ → domain/ → shared/`. Nunca o contrário.

## Fluxo de uma requisição completa

```
                         ┌─────────────────────────────────┐
                         │          app.ts (Fastify)        │
                         │  helmet → cors → rateLimit       │
                         └─────────┬───────────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              │                                         │
     Rota pública                              Rota admin
  /api/lojas/:slug/...                      /api/products/...
              │                                         │
   store-context.plugin                        jwt.plugin
   (resolveStore → request.store)        (authenticate → request.user)
              │                                         │
   plan-limits.plugin (opcional)          plan-limits.plugin (opcional)
              │                                         │
              └────────────────────┬────────────────────┘
                                   │
                          Handler da rota
                     (http/routes/<feature>)
                                   │
                        Schema Zod (validação)
                     (http/schemas/<feature>)
                                   │
                        Service do domain
                     (domain/<feature>/services)
                                   │
                     Prisma (com tenant guard)
                     (shared/database)
                                   │
                         PostgreSQL
```
