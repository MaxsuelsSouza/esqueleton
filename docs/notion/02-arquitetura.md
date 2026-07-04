# 02 — Arquitetura

[← Voltar ao início](00-inicio.md)

## Monorepo

O projeto usa **pnpm workspaces** com três pacotes:

```
apps/
  api/          # Fastify 4 + TypeScript (CommonJS) — porta 3001
  web/          # Next.js 14 + Tailwind (App Router) — porta 3000
packages/
  shared/       # Tipos TypeScript compartilhados (consumidos direto, sem build)
```

## A API em três camadas

A API segue uma separação estrita entre infraestrutura, negócio e HTTP:

```
apps/api/src/
  main.ts        # inicia o servidor (porta 3001)
  app.ts         # monta o servidor: registra plugins e rotas (~80 linhas)
  vercel.ts      # entrada serverless para deploy na Vercel

  shared/        # INFRAESTRUTURA transversal — sem lógica de negócio
    database/    #   prisma.plugin (conexão) + tenant-guard (isolamento)
    email/       #   resend.plugin (app.email.send, no-op sem API key) + templates
    storage/     #   r2.plugin (app.storage), r2-key, image-upload.service
    cache/       #   rate-limit-redis (lazy-load ioredis)
    validation/  #   schemas Zod reutilizáveis (id, date, slug, phone, imageUrl…)
    errors/      #   error-handler (ZodError → 400; 5xx mascarado)

  domain/        # LÓGICA DE NEGÓCIO pura — sem HTTP, sem Fastify
    identity/    #   auth.service (registro), role.guard, super-admin.guard
    store/       #   store-availability.service (trial ou assinatura ativa)
    catalog/     #   product.service, category.service (BFS de descendentes)
    pricing/     #   coupon.service (isCouponUsable)
    order/       #   order.service (validateOrderArithmetic — função pura)
    billing/     #   trial.ts, mercadopago.adapter
    analytics/   #   analytics.service (agregações)
    notification/#   notification.service (entidades expiradas)
    session/     #   session-store (Redis ou memória)

  http/          # CAMADA HTTP — rotas, schemas, plugins Fastify
    plugins/     #   jwt.plugin, store-context.plugin, plan-limits.plugin, session.plugin
    schemas/     #   validações Zod por feature (14 arquivos)
    routes/      #   auth/, catalog/, pricing/, order/, billing/, webhooks/,
                 #   analytics/, notification/, admin/, super/, session/
```

**Regra de ouro:** `domain/` nunca importa Fastify; `shared/` nunca contém regra de negócio; `http/` só orquestra.

## Padrão de rotas: público × admin

Cada feature exporta **dois plugins Fastify**:

| Plugin | Prefixo | Autenticação | Contexto de loja |
|--------|---------|--------------|------------------|
| `<feature>PublicRoutes` | `/api/lojas/:slug/...` | Nenhuma | `request.store` (resolvido pelo slug) |
| `<feature>AdminRoutes` | `/api/<feature>` | JWT obrigatório | `request.user.storeId` (do token) |

Ambos são registrados em `app.ts`. As rotas admin aplicam `app.addHook('preHandler', app.authenticate)` no grupo — **incluindo GETs**.

## Fluxo de dados (público)

```
Página /loja/[slug]
  → catalogService.listPublicProducts(slug)          (apps/web/src/services)
  → api-client.ts prefixa com NEXT_PUBLIC_API_URL/api
  → GET /api/lojas/:slug/products                    (Fastify)
  → resolveStore resolve o slug (cache 60s) → request.store
  → query Prisma filtrada por storeId (tenant guard confere)
```

## Fluxo de dados (admin)

```
Página /admin/produtos
  → catalogService.createProduct(token, data)
  → POST /api/products com Authorization: Bearer <token>
  → app.authenticate valida o JWT → request.user { sub, storeId, role, … }
  → checkPlanLimit('maxProducts') (preHandler — 403 se limite atingido)
  → uploadImage (R2 em prod, base64 passthrough em dev)
  → prisma.product.create({ data: { …, storeId: request.user.storeId } })
```

## Web (Next.js App Router)

```
apps/web/src/
  app/
    page.tsx              # landing page do SaaS
    loja/[slug]/          # loja pública: catálogo, produto, sacola, favoritos
    admin/                # painel: login, produtos, categorias, promoções,
                          # cupons, usuários, plano, super/*
  components/             # catalog/ (ProductCard, filtros…), header/
  hooks/                  # useAdminAuth, useStoreSlug
  services/               # api-client + 1 service por feature
  utils/                  # categories, promotions, coupons, featured
  mocks/                  # dados de exemplo (flag USE_MOCK_DATA nas páginas)
  middleware.ts           # rewrite de subdomínio → /loja/{slug}
```

## Testes

- **API:** Vitest com **Prisma fake injetado** (`buildApp({ prisma })` — ver `test/test-helpers.ts`). Nenhum banco real é necessário.
- **Isolamento multi-tenant:** `test/tenant-isolation.test.ts` + testes unitários do guard em `tenant-guard.test.ts`.
- **Web:** testes unitários de utils e componentes.
- Rodar tudo: `pnpm test`.

## Grafos de código (graphify)

Grafos AST do código para navegação e análise de impacto:

- `apps/api/graphify-out/` — 805 nós, 1304 arestas, 62 comunidades
- `apps/web/graphify-out/` — 841 nós, 1446 arestas, 75 comunidades

Cada diretório contém `graph.json` (dados), `graph.html` (visualização interativa) e `GRAPH_REPORT.md` (relatório por comunidades).

## Próxima página

→ [03 — Multi-tenancy](03-multi-tenancy.md)
