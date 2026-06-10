# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A monorepo skeleton for building simple catalog/showcase projects. Not for e-commerce with payments or high-traffic systems — meant for product listings, storefronts, and similar use cases.

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

# Run everything in dev mode
pnpm dev

# Run only one app
pnpm --filter @esqueleton/api dev
pnpm --filter @esqueleton/web dev

# Prisma
pnpm --filter @esqueleton/api db:migrate   # run migrations
pnpm --filter @esqueleton/api db:generate  # regenerate client after schema change
pnpm --filter @esqueleton/api db:studio    # open Prisma Studio

# Type-check all packages
pnpm lint
```

## Architecture

```
apps/api/
  src/
    main.ts                      # inicia o servidor (porta 3001)
    app.ts                       # monta o servidor: registra plugins e rotas
    vercel.ts                    # entrada serverless para deploy na Vercel
    database/
      prisma.plugin.ts           # conexão com o banco de dados
    auth/
      jwt.plugin.ts              # verifica token JWT e expõe app.authenticate
      auth.routes.ts             # POST /api/auth/register e /api/auth/login
    catalog/
      catalog.routes.ts          # GET/POST/PUT/DELETE /api/products
      catalog.schema.ts          # validações Zod dos dados de produto
  prisma/
    schema.prisma                # modelos: User, Product, Category, ProductCategory

apps/web/
  src/
    app/
      layout.tsx                      # estrutura base — inclui Header público
      page.tsx                        # catálogo público com filtros e busca
      globals.css                     # estilos globais (overflow-x: hidden no body)
      produto/[id]/page.tsx           # detalhe do produto
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
        Header.tsx                    # cabeçalho público — oculto em rotas /admin
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

**Data flow:** Web calls `catalogService.listProducts()` → `services/catalog.service.ts` → `services/api-client.ts` prefixes with `NEXT_PUBLIC_API_URL/api` → Fastify route under `/api/products`.

**Auth flow:** `POST /api/auth/login` returns `{ token }` → send as `Authorization: Bearer <token>` header on protected routes.

**Protected routes:** POST, PUT, DELETE on `/api/products` require JWT. GET is public. Protection is applied via `preHandler: [app.authenticate]` in `catalog.routes.ts`.

## Mock data flag

All pages that load data have a `USE_MOCK_DATA = true` flag at the top. Set to `false` when the API is ready. Mocks live in `apps/web/src/mocks/`.

## Shared types summary

| Type | Description |
|------|-------------|
| `Product` | Produto com `brand`, `categoryIds`, `originalPrice` |
| `Category` | Categoria com `parentId` — suporta árvore de qualquer profundidade |
| `Promotion` | Promoção com tipo, desconto, horário e período opcionais |
| `Coupon` | Cupom com código, desconto, limite de usos e validade |
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

O cliente digita um código de cupom no campo acima do catálogo. O cupom é validado localmente (active, dates, maxUses) e aplicado ao preço exibido. Cupons com `productIds` não vazios afetam apenas esses produtos.

**Featured sections**: `getActiveFeatured` picks the first `Featured` where `active === true` and date/time is within range. The banner is hidden when none is active.

## Admin area

`/admin` is a protected area with its own layout (no public Header). Currently runs without auth enforcement (`USE_MOCK_DATA = true`). The login page at `/admin/login` exists and saves the JWT token to `localStorage` for when auth is enabled.

- `/admin/produtos` — CRUD de produtos com upload de foto (galeria ou câmera)
- `/admin/categorias` — árvore interativa de categorias com criar/editar/excluir
- `/admin/promocoes` — promoções flexíveis: tipo é apenas um rótulo, todos os campos são sempre disponíveis
- `/admin/cupons` — cupons com código, desconto, limite de usos e validade

## Prisma schema (models)

- `User` — email + senha
- `Product` — brand, name, description, price, originalPrice, imageUrl
- `Category` — self-referential via `parent`/`children` (`CategoryTree` relation)
- `ProductCategory` — junção many-to-many entre Product e Category

## Environment variables

Copy `.env.example` to `.env` in each app before running.

- `apps/api/.env` — `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `JWT_SECRET`
- `apps/web/.env.local` — `NEXT_PUBLIC_API_URL`

## Adding a new feature

1. Add model to `apps/api/prisma/schema.prisma`
2. Run `pnpm --filter @esqueleton/api db:migrate`
3. Add shared types to `packages/shared/src/index.ts`
4. Create a new folder under `apps/api/src/` with `<feature>.routes.ts` and `<feature>.schema.ts`
5. Register the new routes in `apps/api/src/app.ts`
6. Create `apps/web/src/services/<feature>.service.ts` with the API calls for the feature
7. Add mock data to `apps/web/src/mocks/<feature>.ts`
8. Create components under `apps/web/src/components/<feature>/` and pages under `apps/web/src/app/`
9. If the feature has admin management, add a page under `apps/web/src/app/admin/<feature>/page.tsx` and register the nav link in `apps/web/src/app/admin/layout.tsx`

## Deployment

- **Web (Vercel):** Deploy `apps/web` as a standard Next.js project. Set `NEXT_PUBLIC_API_URL` to the deployed API URL.
- **API (Vercel):** Deploy `apps/api` as a separate Vercel project. `vercel.json` routes all requests to `src/vercel.ts` via `@vercel/node`. Set `DATABASE_URL`, `CORS_ORIGIN`, and `JWT_SECRET` as environment variables.
- **API (VPS):** Run `pnpm build` then `pnpm start`. The `docker-compose.yml` at the root is for local Postgres only.
