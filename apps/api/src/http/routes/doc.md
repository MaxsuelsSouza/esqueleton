# http/routes/ — Handlers HTTP

Rotas agrupadas por feature. Cada pasta exporta plugins Fastify via `index.ts` (barrel).

## Estrutura padrão de cada pasta

```
<feature>/
  <feature>.routes.ts       # handlers (exporta PublicRoutes e/ou AdminRoutes)
  <feature>.routes.test.ts  # testes com Vitest
  index.ts                  # barrel export
```

## Pastas

| Pasta | Prefixo público | Prefixo admin | O que faz |
|-------|----------------|---------------|-----------|
| [`auth/`](auth/doc.md) | — | `/api/auth` | Login, registro, senha, verificação de e-mail |
| [`catalog/`](catalog/doc.md) | `/api/lojas/:slug/products` | `/api/products` | CRUD de produtos |
| [`catalog/`](catalog/doc.md) | `/api/lojas/:slug/categories` | `/api/categories` | CRUD de categorias |
| [`pricing/`](pricing/doc.md) | `/api/lojas/:slug/coupons` | `/api/coupons` | CRUD de cupons |
| [`pricing/`](pricing/doc.md) | `/api/lojas/:slug/promotions` | `/api/promotions` | CRUD de promoções |
| [`pricing/`](pricing/doc.md) | `/api/lojas/:slug/featured` | `/api/featured` | CRUD de destaques |
| [`order/`](order/doc.md) | `/api/lojas/:slug/orders` | `/api/orders` | Pedidos e clientes |
| [`billing/`](billing/doc.md) | `/api/billing` (planos públicos) | `/api/billing` | Assinatura e planos |
| [`webhooks/`](webhooks/doc.md) | — | `/api/webhooks` | Webhook MercadoPago |
| [`analytics/`](analytics/doc.md) | `/api/lojas/:slug/analytics` | `/api/analytics` | Eventos e métricas |
| [`notification/`](notification/doc.md) | — | `/api/notifications` | Notificações do admin |
| [`admin/`](admin/doc.md) | `/api/lojas/:slug/store-profile` | `/api/store-profile`, `/api/users` | Perfil da loja e equipe |
| [`super/`](super/doc.md) | — | `/api/super/*` | Gestão da plataforma |
| [`session/`](session/doc.md) | `/api/lojas/:slug/session` | — | Sacola e favoritos |

## Padrão de exports

```typescript
// Toda feature com acesso público E admin exporta dois plugins:
export const featurePublicRoutes: FastifyPluginAsync = async (app) => { ... }
export const featureAdminRoutes: FastifyPluginAsync = async (app) => { ... }

// Barrel (index.ts)
export { featurePublicRoutes, featureAdminRoutes } from './feature.routes'
```

## Registro em app.ts

```typescript
// Rotas públicas — dentro do grupo com resolveStore
publicApp.register(featurePublicRoutes, { prefix: '/features' })

// Rotas admin — na raiz
app.register(featureAdminRoutes, { prefix: '/api/features' })
```
