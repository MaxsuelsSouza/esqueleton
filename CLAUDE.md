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
- **Image storage:** Cloudflare R2 (S3-compatible) via `@aws-sdk/client-s3`. Sem credenciais R2, imagens ficam como base64 no banco (ok em dev); em produção as 5 variáveis `R2_*` são obrigatórias.
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
- **Billing (Stripe):** plans (`Plan`, platform-wide) define JSON `limits` (`maxProducts`, `maxUsers`, `maxOrdersPerMonth`); each store has a `Subscription`. `app.checkPlanLimit('<limit>')` (`billing/plan-limits.plugin.ts`) is a preHandler that returns 403 when the store's active plan limit is reached — applied on `POST /api/products`, `POST /api/lojas/:slug/orders` (storeId comes from the slug there) and imperatively (`app.planLimitStatus`) on the register invite mode. No active subscription or missing limit key = unlimited (never locks a store out by accident). `POST /api/billing/subscribe`/`cancel` are OWNER-only; paid plans redirect to the Stripe Checkout (`session.url`) and the subscription stays `PENDING` until the webhook (`POST /api/webhooks/stripe`, signature-validated via `STRIPE_WEBHOOK_SECRET`) flips it to `ACTIVE`. Each `Plan` maps to a Stripe `Product`+`Price`; each `Store` reuses a `stripeCustomerId` across plan changes. Without `STRIPE_SECRET_KEY` payment operations are no-ops (dev; the Stripe SDK is lazy-imported only when configured). Web page: `/admin/plano`.
- **Cobrança fixa no dia 10:** a cobrança recorrente acontece sempre no dia 10. O checkout coleta o cartão (`payment_method_collection: 'always'`) mas o primeiro débito é ancorado via `subscription_data.trial_end` (`domain/billing/billing-cycle.ts`) — o mês vigente não é cobrado. O **autocadastro público** usa `proximoDiaDezUnix` (dia 10 do mês seguinte). A **venda presencial** (super-admin, `super/stores.routes.ts`) usa `primeiroDebitoVendaPresencial`: 30 dias de carência a partir da compra e então o próximo dia 10 (ex.: compra 20/jul → débito 10/set). Na âncora, `checkout.session.completed` chega com `payment_status: 'no_payment_required'` (a par de `'paid'`), o que ativa a loja; `'unpaid'` (boleto/Pix) fica `PENDING`. Falha de renovação (`invoice.payment_failed`) → `PAUSED` + e-mail imediato ao OWNER (`subscriptionPaymentFailedEmail`) + banner no admin "Pagamento não efetuado — sua loja está desativada" com atalho para `/admin/plano`. Um cron diário do dia 10 (`GET /api/jobs/verificar-assinaturas`, auth `CRON_SECRET`, `vercel.json`) reconcilia o status de cada assinatura com o Stripe — rede de segurança caso um webhook se perca.
- **Histórico de faturas:** `GET /api/billing/invoices?startingAfter=<id>` (admin) lista as faturas do `stripeCustomerId` da loja (paginação por cursor do Stripe). Sem Customer → lista vazia. A seção "Faturas" em `/admin/plano` mostra Data/Total/Status e um link "Ver" que abre o invoice hospedado do Stripe (`hostedInvoiceUrl`).
- **Super-admin:** `User.isSuperAdmin` is set manually in the database (no UI creates it — `UPDATE "User" SET "isSuperAdmin" = true WHERE email = '...'`). The JWT carries the flag (optional — old tokens fall back to 403); `requireSuperAdmin` (`auth/super-admin-guard.ts`) protects every `/api/super/*` route (stores list/detail/PATCH status+plan, plans CRUD with Stripe Product+Price creation, platform users list, metrics with MRR). Super routes use `app.prismaRaw` (no tenant guard) because their queries are cross-store by design — never use `prismaRaw` in store routes. Plan deactivation is blocked while stores hold ACTIVE/PENDING/PAUSED subscriptions on it. Web: "Plataforma" nav section (visible only with `admin_is_super_admin` in localStorage) → `/admin/super/{lojas,planos,usuarios,metricas}`.
- `GET /api/coupons` and `GET /api/coupons/:id` require JWT (the list would expose all discount codes). The public checkout uses `GET /api/lojas/:slug/coupons/codigo/:code`, which validates server-side and returns only the fields needed to apply the discount.
- Rate limiting via `@fastify/rate-limit`: 300 req/min global, stricter per-route limits on login (10/min), register (5/min), public POSTs (orders/customers 10/min, analytics 120/min) and coupon code lookup (20/min). Login additionally has a **per-email** limit (10 attempts / 15 min, `preHandler` via `app.rateLimit`) that blocks distributed brute force against a single account. Counters live in process memory by default; setting `REDIS_URL` moves them to a shared Redis (`common/rate-limit-redis.ts`, lazy-loads `ioredis`, `skipOnError: true` so a Redis outage never blocks requests) — required for the limits to hold on serverless.
- Reusable input validators live in `apps/api/src/common/validation.ts` (`idSchema`, `dateSchema`, `timeSchema`, `hexColorSchema`, `httpUrlSchema`, `imageUrlSchema`, `phoneSchema`, `shortText`). Use them in every new schema — IDs, dates, colors and URLs must match the expected format before reaching Prisma.
- Image fields (`Product.imageUrl`, `StoreProfile.logoUrl`, `StoreProfile.bannerUrl`, `StoreProfile.bannerMobileUrl`) use `imageUrlSchema`: accepts an `http(s)://` URL **or** a `data:image/...;base64,...` upload (the admin uploader produces base64), capped at ~3 MB. It blocks `javascript:` and non-image data URIs. Fastify `bodyLimit` is raised to 5 MB so base64 images aren't rejected as 1 MB-over. Images are uploaded to **Cloudflare R2** in production (see "Image storage (R2)" below); in dev without R2 credentials, base64 is kept inline in the database.
- Error handler hides internals: 5xx responses always return `"Erro interno do servidor"`.
- Public `GET /api/lojas/:slug/promotions` and `.../featured` return only `active: true` records of that store; the admin lists (`GET /api/promotions`, `GET /api/featured`) require JWT and return everything from the token's store.
- `POST /api/lojas/:slug/orders` verifies the order arithmetic server-side (lineTotal = unitPrice × quantity, subtotal = sum, total = subtotal − discount), validates each item's `unitPrice` against the database product price (accounting for active promotions and coupons, with 1-centavo tolerance), and increments the coupon's `usedCount` scoped to the store — this is what enforces `maxUses`.
- `trustProxy: true` is set so rate limiting sees the real client IP behind Vercel/nginx.
- Failed logins are logged with `app.log.warn` (email + IP).
- API tests inject a fake Prisma client via `buildApp({ prisma })` — see `apps/api/src/test/test-helpers.ts`. No real database needed.
- **WhatsApp catalog (Meta):** each store can sync products to its WhatsApp Business catalog. `StoreProfile` holds `metaAccessToken`/`metaCatalogId`/`metaWabaId` + `whatsappCatalogEnabled`. The token is **write-only**: admin reads return `hasMetaAccessToken: boolean` instead of the value (never send the token back — any STAFF can read the profile). Sending `null`/`''` clears a credential; omitting the field leaves it untouched. The public profile route uses an **allowlist** (`CAMPOS_PUBLICOS`) — new sensitive fields stay private by default. Product CRUD fires `syncProductToWhatsApp`/`removeProductFromWhatsApp` (fire-and-forget, only when `whatsappCatalogEnabled` and credentials exist); products without a public `http(s)` image URL are skipped (Meta requires `image_url`). The adapter (`domain/catalog/integrations/whatsapp-catalog.adapter.ts`) uses the Meta `/batch` endpoint with method `UPDATE` (upsert — `CREATE` fails on existing retailer_id) and treats per-item `validation_status` errors as failures (a 200 alone doesn't mean success). OWNER-only routes: `POST /whatsapp-test` (5/min), `GET /whatsapp-status` (30/min), `POST /whatsapp-sync` (2/min, requires the toggle on).

### Known accepted risks (document before changing)

- JWT stored in `localStorage` (XSS could steal it; httpOnly cookie would be the alternative).
- No server-side token revocation — logout only clears the browser; tokens stay valid until expiry (1 day).
- Roles are enforced server-side (`requireOwner`) but the web hides UI elements by reading `role` from localStorage — a savvy user could access `/admin/usuarios` directly, but the API would reject the request.
- `orderNumber` is generated client-side (unique-constrained; collision makes the fire-and-forget create fail silently).
- Item `unitPrice` is validated server-side against the database product price, accounting for active promotions and coupons (1-centavo tolerance for rounding). Orders with manipulated prices are rejected with 400.
- Rate limiting without `REDIS_URL` is in-memory: per serverless instance on Vercel. With Redis configured, login brute force (per-IP and per-email) is blocked across instances; other routes remain per-IP only.
- `metaAccessToken` (WhatsApp catalog) is stored in plaintext in the database — a database dump leaks every store's Meta token. Encryption at rest (e.g. AES-GCM with a key from env) would be the alternative. Mitigations in place: the API never returns the token (write-only) and only OWNER can set it.
- WhatsApp catalog sync sends the product's **base price** — active promotions, coupons and per-variant prices are not reflected in the Meta catalog (design decision: the WhatsApp catalog is a showcase; checkout happens on the site with correct prices).
- Meta's `/batch` endpoint is asynchronous: even counting `validation_status` errors, an item can still fail later server-side at Meta. Sync counters are best-effort, not a guarantee.

## Image storage (R2)

Images (product photos, store logos) are uploaded to **Cloudflare R2** via `@aws-sdk/client-s3`. The system is designed so dev works without R2 (base64 stays inline) but production requires it.

**Key schema (tenant isolation):** `{storeId}/{entityType}/{entityId}/{uuid}.{ext}` — mirrors the tenant guard pattern from the database. Functions in `shared/storage/r2-key.ts`.

**Plugin:** `shared/storage/r2.plugin.ts` decorates `app.storage: StorageService | null`. Methods: `upload(key, buffer, contentType)`, `delete(key)`, `deleteByPrefix(prefix)`. Without R2 credentials in dev → `app.storage = null`; without credentials in production → throws at startup.

**Upload service:** `shared/storage/image-upload.service.ts` — `uploadImage()` and `uploadImages()`. Logic: URL → pass through; base64 + storage → upload to R2 and return URL; base64 + null storage (dev only) → return base64 as-is; upload failure → throws (no silent fallback).

**Route integration:** product POST/PUT and store-profile PUT call `uploadImage`/`uploadImages` before saving to the database. Product DELETE does fire-and-forget `deleteByPrefix` to clean up R2 objects.

**Migration script:** `scripts/migrate-images-to-r2.mjs` — reads base64 images from the database, uploads to R2, and replaces database values with URLs. Idempotent (skips http URLs). Supports `--dry-run`.

**Environment variables (all required in production):**
- `R2_ACCOUNT_ID` — Cloudflare account ID
- `R2_ACCESS_KEY_ID` — R2 API token access key
- `R2_SECRET_ACCESS_KEY` — R2 API token secret
- `R2_BUCKET_NAME` — bucket name (e.g. `esqueleton-images`)
- `R2_PUBLIC_URL` — public URL prefix for the bucket (e.g. `https://img.esqueleton.com.br`)

## Architecture

```
apps/api/
  src/
    main.ts                      # inicia o servidor (porta 3001)
    app.ts                       # monta o servidor: registra plugins e rotas (~80 linhas, imports via barrels)
    vercel.ts                    # entrada serverless para deploy na Vercel

    shared/                      # infraestrutura transversal (sem lógica de negócio)
      database/
        prisma.plugin.ts         # conexão com o banco (envolve o cliente com o tenant guard)
        tenant-guard.ts          # bloqueia consultas a dados de loja sem storeId (multi-tenancy)
      email/
        resend.plugin.ts         # integração com Resend — app.email.send() (no-op sem API key)
        templates.ts             # templates HTML de e-mail (reset de senha, verificação)
      storage/
        r2.plugin.ts             # upload de imagens para Cloudflare R2 — app.storage (null em dev sem credenciais)
        r2-key.ts                # geração de keys com isolamento por tenant ({storeId}/{entity}/{id}/{uuid}.ext)
        image-upload.service.ts  # uploadImage/uploadImages — R2 em prod, base64 passthrough em dev
      cache/
        rate-limit-redis.ts      # conexão Redis para rate limiting (lazy-load ioredis)
      validation/
        schemas.ts               # validadores Zod reutilizáveis (id, date, slug, phone, imageUrl, etc.)
      errors/
        error-handler.ts         # trata ZodError (400) e mascara erros 5xx

    domain/                      # lógica de negócio pura — sem HTTP, sem Fastify
      identity/
        services/
          auth.service.ts        # registerStore (transação loja+perfil+owner), registerStaff
        guards/
          role.guard.ts          # requireOwner, requireVerifiedEmail
          super-admin.guard.ts   # requireSuperAdmin
      store/
        services/
          store-availability.service.ts  # isStoreAvailable (trial de 7 dias ou assinatura ativa)
      catalog/
        services/
          product.service.ts     # PRODUCT_INCLUDE, toProductResponse, listarProdutos (filtros+paginação)
          category.service.ts    # collectDescendantIds (BFS para exclusão em cascata)
      pricing/
        services/
          coupon.service.ts      # isCouponUsable (ativo, datas, limite de usos)
      order/
        services/
          order.service.ts       # validateOrderArithmetic (função pura)
      billing/
        trial.ts                 # TRIAL_DIAS, TRIAL_MS, trialStatus
        integrations/
          stripe.adapter.ts      # plugin Stripe — app.stripe (no-op sem STRIPE_SECRET_KEY; SDK lazy-import)
      analytics/
        services/
          analytics.service.ts   # computeAnalyticsSummary (~270 linhas de agregação)
      notification/
        services/
          notification.service.ts # checkExpiredEntities (promoções, cupons, destaques expirados)
      session/
        store/
          session-store.ts       # SessionStore interface + Redis/Memory implementations

    http/                        # camada HTTP — rotas, schemas, plugins Fastify
      plugins/
        jwt.plugin.ts            # verifica JWT e expõe app.authenticate
        store-context.plugin.ts  # resolve :slug → request.store (cache 60s)
        plan-limits.plugin.ts    # app.checkPlanLimit (preHandler 403) e app.planLimitStatus
        session.plugin.ts        # cria sessionStore (Redis ou memória)
      schemas/                   # validações Zod de cada feature (14 arquivos)
      routes/
        auth/                    # auth.routes, password-reset.routes, email-verification.routes + testes
        catalog/                 # catalog.routes (público+admin), category.routes + testes
        pricing/                 # coupon.routes, promotion.routes, featured.routes + testes
        order/                   # order.routes, customer.routes + testes
        billing/                 # billing.routes (planos, subscribe, cancel)
        webhooks/                # stripe.routes (webhook Stripe, raw body) + teste
        analytics/               # analytics.routes (público+admin) + teste
        notification/            # notification.routes (admin only)
        admin/                   # user.routes (OWNER), store-profile.routes
        super/                   # stores, plans, users, metrics (super-admin) + teste
        session/                 # session.routes (sacola/favoritos públicos)

    test/
      test-helpers.ts            # createPrismaFake, buildTestApp, createTestToken
      tenant-isolation.test.ts   # testes de isolamento multi-tenant
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

- `apps/api/.env` — `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `JWT_SECRET`, `RESEND_API_KEY` (opcional), `FROM_EMAIL` (opcional), `FRONTEND_URL` (opcional), `STRIPE_SECRET_KEY` (opcional), `STRIPE_WEBHOOK_SECRET` (opcional), `REDIS_URL` (opcional), `R2_ACCOUNT_ID` + `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` + `R2_BUCKET_NAME` + `R2_PUBLIC_URL` (opcionais em dev, obrigatórios em produção)
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

## Subdomínio por loja

Lojas podem ser acessadas via subdomínio: `meu-slug.plataforma.com` em vez de `plataforma.com/loja/meu-slug`. O path `/loja/{slug}` continua funcionando como fallback.

**Como funciona:** o middleware Next.js (`apps/web/src/middleware.ts`) intercepta cada request, extrai o subdomínio do `Host` header e faz `NextResponse.rewrite()` para `/loja/{slug}{pathname}`. O rewrite é interno — o usuário continua vendo a URL com subdomínio. Toda a stack downstream (`useStoreSlug`, services, API) funciona sem mudanças porque o path reescrito contém o segmento `[slug]`.

**Variável de ambiente:** `NEXT_PUBLIC_ROOT_DOMAIN` define o domínio raiz da plataforma (ex: `esqueleton.com.br`). Sem ela, o middleware tenta inferir automaticamente. Em dev local, subdomínios não funcionam por padrão — use `/loja/{slug}`. Para testar, configure `NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000` e acesse `meu-slug.localhost:3000` (Chrome resolve `*.localhost` nativamente).

**Subdomínios reservados** (não representam lojas): `www`, `admin`, `api`, `app`, `mail`, `cdn`, `staging`, `dev`, `beta`, entre outros — definidos em `SUBDOMAINS_RESERVADOS` no middleware.

**Rotas ignoradas** pelo middleware: `/_next/*`, `/admin/*`, `/favicon.ico`, `/robots.txt`, `/sitemap.xml` e URLs que já começam com `/loja/`.

**Deploy (Vercel):** para habilitar subdomínios em produção, adicionar um wildcard domain `*.plataforma.com` no projeto Vercel do web (Settings → Domains). O DNS deve ter um registro `*.plataforma.com` apontando para Vercel (CNAME).

## Deployment

- **Web (Vercel):** Deploy `apps/web` as a standard Next.js project. Set `NEXT_PUBLIC_API_URL` to the deployed API URL. Para subdomínios, adicionar `*.plataforma.com` como wildcard domain e setar `NEXT_PUBLIC_ROOT_DOMAIN=plataforma.com`.
- **API (Vercel):** Deploy `apps/api` as a separate Vercel project. `vercel.json` routes all requests to `src/vercel.ts` via `@vercel/node`. Set `DATABASE_URL`, `CORS_ORIGIN`, `JWT_SECRET` and `REDIS_URL` (shared rate-limit counters — e.g. Upstash) as environment variables.
- **API (VPS):** Run `pnpm build` then `pnpm start`. The `docker-compose.yml` at the root is for local Postgres only.
