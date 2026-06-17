# routes/pricing/ — Cupons, promoções e destaques

CRUD de cupons de desconto, promoções e seções em destaque.

## Arquivos

### `coupon.routes.ts`

**Exporta:** `couponPublicRoutes`, `couponAdminRoutes`

**Rotas públicas** (`/api/lojas/:slug/coupons`):

| Rota | Rate limit | O que faz |
|------|-----------|-----------|
| `GET /codigo/:code` | 20/min | Valida cupom pelo código (usa `isCouponUsable`) |

Retorna apenas campos necessários para aplicar o desconto — não expõe a lista de cupons.

**Rotas admin** (`/api/coupons`):

| Rota | O que faz |
|------|-----------|
| `GET /` | Lista todos os cupons da loja |
| `GET /:id` | Detalhe de um cupom |
| `POST /` | Cria cupom (unique composta `storeId_code`, 409 se duplicado) |
| `PUT /:id` | Atualiza cupom |
| `DELETE /:id` | Remove cupom (ownership pattern) |

**Unique composta:** `storeId_code`. Lookup: `prisma.coupon.findUnique({ where: { storeId_code: { storeId, code } } })`.

### `promotion.routes.ts`

**Exporta:** `promotionPublicRoutes`, `promotionAdminRoutes`

**Rotas públicas** (`/api/lojas/:slug/promotions`):

| Rota | O que faz |
|------|-----------|
| `GET /` | Lista promoções ativas da loja (`active: true`) |

**Rotas admin** (`/api/promotions`):

| Rota | O que faz |
|------|-----------|
| `GET /` | Lista todas as promoções |
| `POST /` | Cria promoção |
| `PUT /:id` | Atualiza promoção |
| `DELETE /:id` | Remove promoção |

### `featured.routes.ts`

**Exporta:** `featuredPublicRoutes`, `featuredAdminRoutes`

**Rotas públicas** (`/api/lojas/:slug/featured`):

| Rota | O que faz |
|------|-----------|
| `GET /` | Lista destaques ativos |

**Rotas admin** (`/api/featured`):

| Rota | O que faz |
|------|-----------|
| `GET /` | Lista todos os destaques |
| `POST /` | Cria destaque |
| `PUT /:id` | Atualiza destaque |
| `DELETE /:id` | Remove destaque |

## Testes

- `coupon.routes.test.ts` — CRUD, validação de código, duplicata
- `promotion.routes.test.ts` — CRUD, filtro de ativas
