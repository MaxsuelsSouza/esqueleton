# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A monorepo skeleton for building simple catalog/showcase projects, now **multi-tenant (SaaS)**: several stores share the same database and API, each identified by a `slug`. Not for e-commerce with payments or high-traffic systems — meant for product listings, storefronts, and similar use cases.

## Multi-tenancy (how stores are isolated)

- Every data model has a required `storeId` column pointing to `Store` (the tenant). Deleting a store cascades to all its data.
- **Admin requests** (panel): the JWT payload carries `storeId` — every query filters by `request.user.storeId`.
- **Public requests** (catalog): routes live under `/api/lojas/:slug/...`. The `resolveStore` preHandler (`store/store-context.plugin.ts`) resolves the slug (60s in-memory cache) and attaches `request.store`; unknown or `SUSPENDED` stores answer 404 "Loja não encontrada".
- **Store availability ("pagou, usou"):** a store's public catalog only works during the 7-day trial (counted from `Store.createdAt` — see `billing/trial.ts`) or with an ACTIVE subscription. Outside that, `resolveStore` answers **503 "Ops! Aconteceu um erro..."** — a deliberately generic error so end customers never learn it's a billing issue (the web shows a full-screen error via `store-profile-context`). The admin panel stays accessible so the owner can subscribe. Signup creates NO subscription (trial is implicit); the free plan was deactivated by migration `20260613000000` (legacy free subscriptions remain valid). Cancelling (route or webhook) no longer re-subscribes to a free plan.
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
- **Email:** Resend (`resend` npm) — reset de senha e verificação de e-mail. Sem `RESEND_API_KEY`, e-mails são apenas logados (no-op em dev).
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
- `POST /api/auth/login` returns `{ token, role, emailVerified, store: { slug, name } }`. The JWT payload is `{ sub, email, storeId, role, emailVerified }`; tokens without `storeId` or `role` are rejected by `app.authenticate`.
- `JWT_SECRET` is **required** in production — the API refuses to start without it. Tokens expire in 1 day.
- **Password reset:** `POST /api/auth/forgot-password` (3/min) accepts `{ email }`, creates a `PasswordResetToken` (crypto.randomBytes, 32 bytes hex, 1h expiry), sends a reset link via Resend, and **always returns 200** (does not reveal if the email exists). `POST /api/auth/reset-password` (5/min) accepts `{ token, password }`, validates the token (not expired, not used), updates the password and marks the token as used. Previous tokens for the same user are deleted on each new request. The `PasswordResetToken` model is NOT tenant-scoped (no storeId) — it is looked up by token globally. Web pages: `/admin/esqueci-senha` and `/admin/redefinir-senha?token=xxx`.
- **Roles (OWNER/STAFF):** users have a `role` field (`OWNER` or `STAFF`). The first user of a store is always `OWNER`; additional users created via `POST /api/auth/register` (with JWT) are `STAFF`. `requireOwner` (`auth/role-guard.ts`) returns 403 if the caller is not OWNER — applied on `PUT /api/store-profile`, `POST /api/auth/register` (invite mode), `DELETE /api/users/:id`. `GET /api/users` and `DELETE /api/users/:id` are OWNER-only routes for managing store staff.
- **Email verification:** new users start with `emailVerified: false`. `POST /api/auth/verify-email` (10/min) validates a token from the verification email. `POST /api/auth/resend-verification` (2/min, JWT required) sends a new verification email. `requireVerifiedEmail` (`auth/role-guard.ts`) blocks admin routes after 7 days without verification — enforced inside `app.authenticate` (jwt.plugin), so every admin route gets it automatically; routes that must stay reachable set `config: { skipEmailVerification: true }` (only resend-verification today). `EmailVerificationToken` model is NOT tenant-scoped (global lookup by token). Web pages: `/admin/verificar-email?token=xxx`.
- **Billing notifications:** `PLAN_LIMIT_APPROACHING` (upserted by `checkPlanLimit` when usage reaches 80% of a limit, entityId = limit key), `SUBSCRIPTION_PAYMENT_FAILED` (webhook → PAUSED) and `SUBSCRIPTION_CANCELLED` (webhook → CANCELLED) — all fire-and-forget, deduped by the `storeId+type+entityId` unique.
- **Billing (MercadoPago):** plans (`Plan`, platform-wide) define JSON `limits` (`maxProducts`, `maxUsers`, `maxOrdersPerMonth`); each store has a `Subscription`. `app.checkPlanLimit('<limit>')` (`billing/plan-limits.plugin.ts`) is a preHandler that returns 403 when the store's active plan limit is reached — applied on `POST /api/products`, `POST /api/lojas/:slug/orders` (storeId comes from the slug there) and imperatively (`app.planLimitStatus`) on the register invite mode. No active subscription or missing limit key = unlimited (never locks a store out by accident). `POST /api/billing/subscribe`/`cancel` are OWNER-only; paid plans redirect to the MercadoPago checkout (`init_point`) and the subscription stays `PENDING` until the webhook (`POST /api/webhooks/mercadopago`, HMAC-validated via `MERCADOPAGO_WEBHOOK_SECRET`) flips it to `ACTIVE`. Without `MERCADOPAGO_ACCESS_TOKEN` payment operations are no-ops (dev). Web page: `/admin/plano`.
- **Super-admin:** `User.isSuperAdmin` is set manually in the database (no UI creates it — `UPDATE "User" SET "isSuperAdmin" = true WHERE email = '...'`). The JWT carries the flag (optional — old tokens fall back to 403); `requireSuperAdmin` (`auth/super-admin-guard.ts`) protects every `/api/super/*` route (stores list/detail/PATCH status+plan, plans CRUD with MercadoPago preapproval-plan creation, platform users list, metrics with MRR). Super routes use `app.prismaRaw` (no tenant guard) because their queries are cross-store by design — never use `prismaRaw` in store routes. Plan deactivation is blocked while stores hold ACTIVE/PENDING/PAUSED subscriptions on it. Web: "Plataforma" nav section (visible only with `admin_is_super_admin` in localStorage) → `/admin/super/{lojas,planos,usuarios,metricas}`.
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
- Roles are enforced server-side (`requireOwner`) but the web hides UI elements by reading `role` from localStorage — a savvy user could access `/admin/usuarios` directly, but the API would reject the request.
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
    email/
      resend.plugin.ts           # integração com Resend — decora app.email.send() (no-op sem API key)
      templates.ts               # templates HTML de e-mail (reset de senha, verificação)
    auth/
      jwt.plugin.ts              # verifica token JWT (payload com storeId) e expõe app.authenticate
      auth.routes.ts             # POST /api/auth/register (cria a loja ou convida staff) e /api/auth/login
      password-reset.routes.ts   # POST /api/auth/forgot-password e /api/auth/reset-password
      password-reset.schema.ts   # validações Zod dos dados de redefinição de senha
      email-verification.routes.ts # POST /api/auth/verify-email e /api/auth/resend-verification
      role-guard.ts              # requireOwner (403 se não é OWNER) e requireVerifiedEmail (bloqueia após 7 dias)
    users/
      user.routes.ts             # GET /api/users e DELETE /api/users/:id (OWNER only)
    billing/
      trial.ts                   # período de teste de 7 dias (TRIAL_MS, trialStatus)
      mercadopago.plugin.ts      # integração com MercadoPago — app.mercadopago (no-op sem access token)
      plan-limits.plugin.ts      # app.checkPlanLimit (preHandler 403) e app.planLimitStatus (limites do plano)
      billing.routes.ts          # GET /api/billing/plans (público), /current, /subscribe e /cancel (OWNER)
      billing.schema.ts          # validações Zod de billing
      webhook.routes.ts          # POST /api/webhooks/mercadopago — atualiza o status da assinatura
    super/
      super-stores.routes.ts     # gestão de lojas da plataforma (listar, suspender, trocar plano)
      super-plans.routes.ts      # CRUD de planos (planos pagos criam recorrência no MercadoPago)
      super-users.routes.ts      # lista de todos os usuários da plataforma
      super-metrics.routes.ts    # totais, MRR e assinaturas por plano
      super.schema.ts            # validações Zod das rotas super-admin
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
        esqueci-senha/page.tsx        # formulário "esqueci minha senha" (envia link por e-mail)
        redefinir-senha/page.tsx      # formulário de nova senha (recebe token da URL)
        verificar-email/page.tsx      # verifica e-mail ao clicar no link recebido por e-mail
        usuarios/page.tsx             # gestão da equipe — convidar e remover membros (OWNER only)
        produtos/page.tsx             # gestão de produtos (CRUD + upload de foto)
        categorias/page.tsx           # gestão de categorias em árvore (CRUD)
        promocoes/page.tsx            # gestão de promoções (desconto, kit, compre X leve Y, horário)
        cupons/page.tsx               # gestão de cupons de desconto com código
        plano/page.tsx                # plano atual, uso dos limites e troca/cancelamento (ações OWNER)
        assinatura/page.tsx           # onboarding da ativação: teste de 7 dias, como funciona, assinar (OWNER)
        super/lojas/page.tsx          # plataforma: lojas (busca, suspender/reativar, trocar plano)
        super/planos/page.tsx         # plataforma: CRUD de planos
        super/usuarios/page.tsx       # plataforma: todos os usuários
        super/metricas/page.tsx       # plataforma: totais, MRR e assinaturas por plano
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
      auth.service.ts                 # login, cadastro, reset de senha
      users.service.ts                # gestão de equipe (listar e remover membros)
      billing.service.ts              # planos e assinatura (listar, assinar, cancelar)
      super.service.ts                # chamadas super-admin (lojas, planos, usuários, métricas)
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

**Auth flow:** `POST /api/auth/login` returns `{ token, role, emailVerified, isSuperAdmin, store: { slug, name } }` → token goes in the `Authorization: Bearer <token>` header; the web saves `admin_token`, `admin_store_slug`, `admin_store_name`, `admin_role`, `admin_email_verified` and `admin_is_super_admin` in `localStorage`.

**Protected routes:** every admin route group (`/api/products`, `/api/coupons`, `/api/orders`, …) requires JWT — including GETs. Protection is applied via `app.addHook('preHandler', app.authenticate)` in each `<feature>AdminRoutes`. Public reads happen only under `/api/lojas/:slug/...`.

## Mock data flag

Pages that load data have a `USE_MOCK_DATA` flag at the top — **all currently set to `false`** (the web talks to the real API). Mocks live in `apps/web/src/mocks/` and remain useful for desenvolvimento sem API. With mocks on, the store slug is ignored — any `/loja/<slug>` shows the same sample data.

## Shared types summary

| Type | Description |
|------|-------------|
| `Product` | Produto com `brand`, `categoryIds`, `variants`, `characteristics` |
| `Category` | Categoria com `parentId` — suporta árvore de qualquer profundidade |
| `Promotion` | Promoção com tipo, desconto, horário e período opcionais |
| `Coupon` | Cupom com código, desconto, limite de usos e validade |
| `Store` | Loja (tenant) com `slug`, `name` e `status` |
| `UserRole` | `'OWNER' \| 'STAFF'` — papel do usuário na loja |
| `LoginResponse` | `{ token, role, emailVerified, store: { slug, name } }` retornado pelo login |
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

`/admin` is a protected area with its own layout (no public Header). The login page at `/admin/login` has two modes: sign in, and "Criar minha loja" (public SaaS signup — store name + slug with auto-suggestion + email + password). On login it saves `admin_token`, `admin_store_slug`, `admin_store_name`, `admin_role` and `admin_email_verified` to `localStorage`; the admin layout shows a "Ver minha loja" link to `/loja/<slug>`.

The layout uses `useAdminAuth()` hook which reads role/emailVerified from localStorage. OWNER users see extra nav items (Equipe). A yellow `EmailVerificationBanner` appears at the top when the email is not verified.

- `/admin/produtos` — CRUD de produtos com upload de foto (galeria ou câmera)
- `/admin/categorias` — árvore interativa de categorias com criar/editar/excluir
- `/admin/promocoes` — promoções flexíveis: tipo é apenas um rótulo, todos os campos são sempre disponíveis
- `/admin/cupons` — cupons com código, desconto, limite de usos e validade
- `/admin/usuarios` — gestão da equipe (OWNER only) — convidar e remover membros

## Prisma schema (models)

- `Store` — loja (tenant): slug único, name, status (`ACTIVE`/`SUSPENDED`)
- `User` — email + senha, pertence a uma `Store`. Tem `role` (`OWNER`/`STAFF`), `emailVerified` e `isSuperAdmin` (flag de plataforma, definida manualmente no banco)
- `Product` — brand, name, description, price, imageUrl
- `Category` — self-referential via `parent`/`children` (`CategoryTree` relation)
- `ProductCategory` — junção many-to-many entre Product e Category
- `PasswordResetToken` — token de redefinição de senha (1h de validade, uso único). **Sem storeId** — lookup por token é global.
- `EmailVerificationToken` — token de verificação de e-mail (7 dias de validade, uso único). **Sem storeId** — lookup por token é global.
- `Plan` — plano da plataforma: slug único, `limits` (JSON), `priceInCents` (0 = gratuito), `billingPeriod`. **Sem storeId** — entidade global gerenciada pelo super-admin.
- `Subscription` — assinatura de uma loja a um plano (`ACTIVE`/`PAUSED`/`CANCELLED`/`PENDING`). Tenant-scoped (está no `MODELOS_DE_LOJA` do tenant guard). A migração de billing criou o plano `Gratuito` e uma assinatura ativa para cada loja existente.

Todos os modelos de dados (exceto `Store`, `ProductCategory`, `PasswordResetToken`, `EmailVerificationToken` e `Plan`) têm `storeId` obrigatório com índice. A migração `20260611200000_multi_tenancy` fez o backfill: dados pré-existentes viraram a "loja inicial" (slug derivado do `storeName` do perfil).

## Environment variables

Copy `.env.example` to `.env` in each app before running.

- `apps/api/.env` — `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `JWT_SECRET`, `RESEND_API_KEY` (opcional), `FROM_EMAIL` (opcional), `FRONTEND_URL` (opcional), `MERCADOPAGO_ACCESS_TOKEN` (opcional), `MERCADOPAGO_WEBHOOK_SECRET` (opcional), `REDIS_URL` (opcional)
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
