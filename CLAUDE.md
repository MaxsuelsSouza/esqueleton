# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A monorepo skeleton for building simple catalog/showcase projects, now **multi-tenant (SaaS)**: several stores share the same database and API, each identified by a `slug`. Not for e-commerce with payments or high-traffic systems — meant for product listings, storefronts, and similar use cases.

## Multi-tenancy (how stores are isolated)

- Every data model has a required `storeId` column pointing to `Store` (the tenant). Deleting a store cascades to all its data.
- **Admin requests** (panel): the JWT payload carries `storeId` — every query filters by `request.user.storeId`.
- **Public requests** (catalog): routes live under `/api/lojas/:slug/...`. The `resolveStore` preHandler (`store/store-context.plugin.ts`) resolves the slug (60s in-memory cache) and attaches `request.store`; unknown or `SUSPENDED` stores answer 404 "Loja não encontrada".
- **Tenant guard** (`database/tenant-guard.ts`): wraps the Prisma client (real and test fakes) and THROWS when a query on a tenant model lacks `storeId` (in `where` for reads/updates/deletes, in `data` for creates). It never injects the filter automatically — routes must be explicit. `User` (login by global email) and `Store` are exempt.
- Uniques are per-store composites: `Coupon @@unique([storeId, code])`, `Customer @@unique([storeId, phone])`, `Order @@unique([storeId, orderNumber])`, `Notification @@unique([storeId, type, entityId])`. In Prisma lookups use e.g. `where: { storeId_code: { storeId, code } }`.
- `update`/`delete` by id use the ownership pattern: `updateMany/deleteMany({ where: { id, storeId } })` + 404 when `count === 0`.
- Each route file exports two plugins: `<feature>PublicRoutes` (registered under `/api/lojas/:slug`) and `<feature>AdminRoutes` (registered at `/api/<feature>`, all behind `app.authenticate`). See `app.ts`.
- Tenant isolation tests live in `apps/api/src/test/tenant-isolation.test.ts`; the guard has its own unit tests in `database/tenant-guard.test.ts`.

## Code readability

Every file must be readable by someone who is not a programmer. This applies to:

- **Folder and file names:** use clear, descriptive names that explain the purpose without opening the file. Avoid abbreviations and technical jargon.
- **Comments:** whenever logic is not immediately obvious from the code, add a short comment in plain language explaining *what it does* and *why*.
- **Validation messages:** error messages returned by the API must be in plain Portuguese (e.g. `"Nome é obrigatório"`, not `"name: required"`).
- **Variable and function names:** prefer full words over abbreviations (`productList` not `pl`, `createProduct` not `cp`).

## Stack

- **Monorepo:** pnpm workspaces
- **API:** Fastify 4 + TypeScript (CommonJS)
- **Web:** Next.js 14 + TypeScript + Tailwind CSS (App Router, `src/` directory)
- **Database:** PostgreSQL via Prisma
- **Auth:** JWT via `@fastify/jwt` + bcryptjs
- **Shared types:** `packages/shared` (TypeScript source consumed directly, no build step)

## Commands

```bash
# Install all dependencies
pnpm install

# Start local Postgres
docker-compose up -d

# Run everything in dev mode (default database)
pnpm dev

# Run against an alternative database profile (own Postgres container + data)
# Requires apps/api/.env.<profile> (copy the .env.<profile>.example) and a
# postgres-<profile> service in docker-compose.yml
pnpm dev --loja1
pnpm --filter @esqueleton/api db:migrate --loja1   # migrate that profile's database

# Run only one app
pnpm --filter @esqueleton/api dev
pnpm --filter @esqueleton/web dev

# Prisma
pnpm --filter @esqueleton/api db:migrate   # run migrations
pnpm --filter @esqueleton/api db:generate  # regenerate client after schema change
pnpm --filter @esqueleton/api db:studio    # open Prisma Studio

# Type-check all packages
pnpm lint

# Run all tests (Vitest — API route tests + web unit tests)
pnpm test
pnpm --filter @esqueleton/api test
pnpm --filter @esqueleton/web test
```

## Security rules

- `POST /api/auth/register` has two modes: without a token it is the public SaaS signup — creates `Store` + `StoreProfile` + first `User` in one transaction (body: `email`, `password`, `storeName`, `storeSlug`); with a valid JWT it creates another user **in the caller's store**. Slugs are validated by `slugSchema` (lowercase/numbers/hyphen, 3–40 chars) and a reserved list (`admin`, `api`, `loja`, …).
- `POST /api/auth/login` returns `{ token, store: { slug, name } }`. The JWT payload is `{ sub, email, storeId }`; tokens without `storeId` (pre-multi-tenancy) are rejected by `app.authenticate`.
- `JWT_SECRET` is **required** in production — the API refuses to start without it. Tokens expire in 1 day.
- `GET /api/coupons` and `GET /api/coupons/:id` require JWT (the list would expose all discount codes). The public checkout uses `GET /api/lojas/:slug/coupons/codigo/:code`, which validates server-side and returns only the fields needed to apply the discount.
- Rate limiting via `@fastify/rate-limit`: 300 req/min global, stricter per-route limits on login (10/min), register (5/min), public POSTs (orders/customers 10/min, analytics 120/min) and coupon code lookup (20/min). Login additionally has a **per-email** limit (10 attempts / 15 min, `preHandler` via `app.rateLimit`) that blocks distributed brute force against a single account. Counters live in process memory by default; setting `REDIS_URL` moves them to a shared Redis (`common/rate-limit-redis.ts`, lazy-loads `ioredis`, `skipOnError: true` so a Redis outage never blocks requests) — required for the limits to hold on serverless.
- Reusable input validators live in `apps/api/src/common/validation.ts` (`idSchema`, `dateSchema`, `timeSchema`, `hexColorSchema`, `httpUrlSchema`, `imageUrlSchema`, `phoneSchema`, `shortText`). Use them in every new schema — IDs, dates, colors and URLs must match the expected format before reaching Prisma.
- Image fields (`Product.imageUrl`, `StoreProfile.logoUrl`) use `imageUrlSchema`: accepts an `http(s)://` URL **or** a `data:image/...;base64,...` upload (the admin uploader produces base64), capped at ~3 MB. It blocks `javascript:` and non-image data URIs. Fastify `bodyLimit` is raised to 5 MB so base64 images aren't rejected as 1 MB-over. Images are stored inline (no external file storage yet) — migrating to S3/Cloudinary/Vercel Blob is a known follow-up.
- Error handler hides internals: 5xx responses always return `"Erro interno do servidor"`.
- Public `GET /api/lojas/:slug/promotions` and `.../featured` return only `active: true` records of that store; the admin lists (`GET /api/promotions`, `GET /api/featured`) require JWT and return everything from the token's store.
- `POST /api/lojas/:slug/orders` verifies the order arithmetic server-side (lineTotal = unitPrice × quantity, subtotal = sum, total = subtotal − discount) and increments the coupon's `usedCount` scoped to the store — this is what enforces `maxUses`.
- `trustProxy: true` is set so rate limiting sees the real client IP behind Vercel/nginx.
- Failed logins are logged with `app.log.warn` (email + IP).
- API tests inject a fake Prisma client via `buildApp({ prisma })` — see `apps/api/src/test/test-helpers.ts`. No real database needed.

### Known accepted risks (document before changing)

- JWT stored in `localStorage` (XSS could steal it; httpOnly cookie would be the alternative).
- No server-side token revocation — logout only clears the browser; tokens stay valid until expiry (1 day).
- No roles: every authenticated user has full admin power **within their store**, including creating more users in it.
- `orderNumber` is generated client-side (unique-constrained; collision makes the fire-and-forget create fail silently).
- Item `unitPrice` comes from the client — only the arithmetic is verified, prices are not recomputed from the database (admin confirms each order manually via WhatsApp).
- Rate limiting without `REDIS_URL` is in-memory: per serverless instance on Vercel. With Redis configured, login brute force (per-IP and per-email) is blocked across instances; other routes remain per-IP only.

## Architecture

```
apps/api/
  src/
    main.ts                      # inicia o servidor (porta 3001)
    app.ts                       # monta o servidor: registra plugins e rotas
    vercel.ts                    # entrada serverless para deploy na Vercel
    database/
      prisma.plugin.ts           # conexão com o banco de dados (envolve o cliente com o tenant guard)
      tenant-guard.ts            # bloqueia consultas a dados de loja sem storeId (multi-tenancy)
    store/
      store-context.plugin.ts    # resolve o :slug das rotas públicas → request.store
    auth/
      jwt.plugin.ts              # verifica token JWT (payload com storeId) e expõe app.authenticate
      auth.routes.ts             # POST /api/auth/register (cria a loja) e /api/auth/login
    catalog/
      catalog.routes.ts          # catalogPublicRoutes (/api/lojas/:slug/products) + catalogAdminRoutes (/api/products)
      catalog.schema.ts          # validações Zod dos dados de produto
  prisma/
    schema.prisma                # modelos: Store (tenant), User, Product, Category, ProductCategory, …

apps/web/
  src/
    app/
      layout.tsx                      # estrutura base (html/body/globals)
      page.tsx                        # página de apresentação do SaaS — link para /admin/login
      globals.css                     # estilos globais (overflow-x: hidden no body)
      loja/[slug]/
        layout.tsx                    # layout público da loja — contexts + Header (slug na URL)
        page.tsx                      # catálogo público com filtros e busca
        produto/[id]/page.tsx         # detalhe do produto
        sacola/page.tsx               # sacola e envio pelo WhatsApp
        favoritos/page.tsx            # produtos favoritados
      admin/
        layout.tsx                    # layout da área admin (sidebar + nav mobile em carrossel)
        page.tsx                      # redireciona /admin → /admin/produtos
        login/page.tsx                # tela de login do admin
        produtos/page.tsx             # gestão de produtos (CRUD + upload de foto)
        categorias/page.tsx           # gestão de categorias em árvore (CRUD)
        promocoes/page.tsx            # gestão de promoções (desconto, kit, compre X leve Y, horário)
        cupons/page.tsx               # gestão de cupons de desconto com código
    components/
      catalog/
        ProductCard.tsx               # cartão de produto (grade e lista) — exibe marca, nome, preço
        ProductPrice.tsx              # exibe preço com desconto e porcentagem
        CatalogToolbar.tsx            # barra com busca, filtros e alternador de exibição
        CatalogFilters.tsx            # filtros: árvore de categorias, preço, ordenação
        CatalogSearch.tsx             # campo de busca
        DisplayToggle.tsx             # alternador grade/lista (dropdown)
        FeaturedSection.tsx           # seção "Em destaque" no topo do catálogo
      header/
        Header.tsx                    # cabeçalho público — vive apenas dentro de /loja/[slug]
    hooks/
      useAdminAuth.ts                 # verifica token do admin no localStorage
    mocks/
      products.ts                     # 30 produtos de exemplo (perfumes e banho)
      categories.ts                   # árvore de categorias de exemplo
      promotions.ts                   # promoções de exemplo
      coupons.ts                      # cupons de exemplo
    services/
      api-client.ts                   # cliente HTTP base — todas as chamadas passam aqui
      auth.service.ts                 # login e cadastro
      catalog.service.ts              # busca e gestão de produtos
      categories.service.ts           # busca e gestão de categorias
      promotions.service.ts           # busca e gestão de promoções
      coupons.service.ts              # busca e gestão de cupons
    services/
      featured.service.ts             # busca e gestão de seções em destaque
    utils/
      categories.ts                   # funções para árvore de categorias (flatten, buildTree, expandir seleção)
      promotions.ts                   # isPromotionActive, applyPromotionsToProducts
      featured.ts                     # isFeaturedActive, getActiveFeatured
      coupons.ts                      # validateCoupon, applyCouponToProduct, couponErrorMessage

packages/shared/
  src/index.ts                   # tipos compartilhados: Product, Category, Promotion, Coupon, User, ApiResponse
```

**Data flow (public):** a page under `/loja/[slug]` calls `catalogService.listPublicProducts(slug)` → `services/api-client.ts` prefixes with `NEXT_PUBLIC_API_URL/api` → Fastify route `/api/lojas/:slug/products`. Public service functions are prefixed `Public` and take the slug (from `useStoreSlug()`).

**Auth flow:** `POST /api/auth/login` returns `{ token, store: { slug, name } }` → token goes in the `Authorization: Bearer <token>` header; the web saves `admin_token`, `admin_store_slug` and `admin_store_name` in `localStorage`.

**Protected routes:** every admin route group (`/api/products`, `/api/coupons`, `/api/orders`, …) requires JWT — including GETs. Protection is applied via `app.addHook('preHandler', app.authenticate)` in each `<feature>AdminRoutes`. Public reads happen only under `/api/lojas/:slug/...`.

## Mock data flag

All pages that load data have a `USE_MOCK_DATA = true` flag at the top. Set to `false` when the API is ready. Mocks live in `apps/web/src/mocks/`. With mocks on, the store slug is ignored — any `/loja/<slug>` shows the same sample data.

## Shared types summary

| Type | Description |
|------|-------------|
| `Product` | Produto com `brand`, `categoryIds`, `originalPrice` |
| `Category` | Categoria com `parentId` — suporta árvore de qualquer profundidade |
| `Promotion` | Promoção com tipo, desconto, horário e período opcionais |
| `Coupon` | Cupom com código, desconto, limite de usos e validade |
| `Store` | Loja (tenant) com `slug`, `name` e `status` |
| `LoginResponse` | `{ token, store: { slug, name } }` retornado pelo login |
| `DisplayMode` | `'grid'` ou `'list'` |
| `CatalogFilters` | Filtros do catálogo: busca, categorias, preço, ordenação |

## Category tree

Categories are self-referential (`parentId`). Utilities in `utils/categories.ts`:
- `flattenCategories(tree)` — árvore → lista plana
- `buildCategoryTree(flat)` — lista plana → árvore
- `expandSelectedCategories(ids, all)` — expande IDs selecionados para incluir todos os descendentes (usado no filtro do catálogo)

## Public catalog data flow

`page.tsx` applies several transformations before rendering, in this order:
1. **Promotions** (`applyPromotionsToProducts`) — modifica preços e adiciona badge
2. **Cupom** (`applyCouponToProduct`) — sobrescreve preço dos produtos elegíveis
3. **Filtros/ordenação** — aplicados sobre o resultado final

O cliente digita um código de cupom no campo acima do catálogo. O cupom é validado **no servidor** via `GET /api/lojas/:slug/coupons/codigo/:code` (active, dates, maxUses) — a API retorna apenas os campos necessários para aplicar o desconto, sem expor os demais cupons. Cupons com `productIds` não vazios afetam apenas esses produtos.

**Featured sections**: `getActiveFeatured` picks the first `Featured` where `active === true` and date/time is within range. The banner is hidden when none is active.

## Admin area

`/admin` is a protected area with its own layout (no public Header). Currently runs without auth enforcement (`USE_MOCK_DATA = true`). The login page at `/admin/login` has two modes: sign in, and "Criar minha loja" (public SaaS signup — store name + slug with auto-suggestion + email + password). On login it saves `admin_token`, `admin_store_slug` and `admin_store_name` to `localStorage`; the admin layout shows a "Ver minha loja" link to `/loja/<slug>`.

- `/admin/produtos` — CRUD de produtos com upload de foto (galeria ou câmera)
- `/admin/categorias` — árvore interativa de categorias com criar/editar/excluir
- `/admin/promocoes` — promoções flexíveis: tipo é apenas um rótulo, todos os campos são sempre disponíveis
- `/admin/cupons` — cupons com código, desconto, limite de usos e validade

## Prisma schema (models)

- `Store` — loja (tenant): slug único, name, status (`ACTIVE`/`SUSPENDED`)
- `User` — email + senha, pertence a uma `Store`
- `Product` — brand, name, description, price, originalPrice, imageUrl
- `Category` — self-referential via `parent`/`children` (`CategoryTree` relation)
- `ProductCategory` — junção many-to-many entre Product e Category

Todos os modelos de dados (exceto `Store` e a junção `ProductCategory`) têm `storeId` obrigatório com índice. A migração `20260611200000_multi_tenancy` fez o backfill: dados pré-existentes viraram a "loja inicial" (slug derivado do `storeName` do perfil).

## Environment variables

Copy `.env.example` to `.env` in each app before running.

- `apps/api/.env` — `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `JWT_SECRET`
- `apps/web/.env.local` — `NEXT_PUBLIC_API_URL`

### Database profiles (multiple local databases)

`pnpm dev --<profile>` runs the stack against an isolated Postgres (own container, port and volume). How it works: `scripts/dev.mjs` starts `docker compose --profile <profile> up -d` (trying `docker compose`, `docker-compose` and `wsl docker compose`, in that order — on this machine Docker only runs inside WSL) and sets `PERFIL=<profile>`; `apps/api/scripts/com-perfil.mjs` then loads `apps/api/.env.<profile>` instead of `.env` (it also accepts the profile as a trailing `--<profile>` argument, which is how `db:migrate --loja1` works). Profiles `loja1` (port 5433) and `loja2` (port 5434) ship as examples. To add one: duplicate a `postgres-lojaX` block in `docker-compose.yml` (new name/port/volume) and create `apps/api/.env.<profile>` pointing at it. Real `.env.*` files are gitignored; only `.example` files are versioned.

## Adding a new feature

1. Add model to `apps/api/prisma/schema.prisma`
2. Run `pnpm --filter @esqueleton/api db:migrate`
3. Add shared types to `packages/shared/src/index.ts`
4. Create a new folder under `apps/api/src/` with `<feature>.routes.ts` and `<feature>.schema.ts`. If the model belongs to a store, add the required `storeId` column + relation + index, export `<feature>PublicRoutes` (uses `request.store!.id`) and `<feature>AdminRoutes` (uses `request.user.storeId`), and filter **every** query by `storeId` — the tenant guard throws if you forget
5. Register the new routes in `apps/api/src/app.ts` (public group under `/api/lojas/:slug`, admin group under `/api/<feature>`)
6. Create `apps/web/src/services/<feature>.service.ts` with the API calls for the feature (`Public`-prefixed functions take the slug; admin functions take the token)
7. Add mock data to `apps/web/src/mocks/<feature>.ts`
8. Create components under `apps/web/src/components/<feature>/` and public pages under `apps/web/src/app/loja/[slug]/`
9. If the feature has admin management, add a page under `apps/web/src/app/admin/<feature>/page.tsx` and register the nav link in `apps/web/src/app/admin/layout.tsx`

## Deployment

- **Web (Vercel):** Deploy `apps/web` as a standard Next.js project. Set `NEXT_PUBLIC_API_URL` to the deployed API URL.
- **API (Vercel):** Deploy `apps/api` as a separate Vercel project. `vercel.json` routes all requests to `src/vercel.ts` via `@vercel/node`. Set `DATABASE_URL`, `CORS_ORIGIN`, `JWT_SECRET` and `REDIS_URL` (shared rate-limit counters — e.g. Upstash) as environment variables.
- **API (VPS):** Run `pnpm build` then `pnpm start`. The `docker-compose.yml` at the root is for local Postgres only.
