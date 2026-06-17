# routes/analytics/ — Eventos e métricas

Registro de eventos de produto e dashboard de métricas.

## Arquivos

### `analytics.routes.ts`

**Exporta:** `analyticsPublicRoutes`, `analyticsAdminRoutes`

**Rotas públicas** (`/api/lojas/:slug/analytics`):

| Rota | Rate limit | O que faz |
|------|-----------|-----------|
| `POST /events` | 120/min | Registra evento de produto (view, cart_add, whatsapp_send, link_copy, favorite, featured_click) |

Eventos são criados como `productEvent` com metadata (promotionId, couponCode, featuredId, etc.).

**Rotas admin** (`/api/analytics`):

| Rota | O que faz |
|------|-----------|
| `GET /` | Retorna métricas completas via `computeAnalyticsSummary` |

O GET dispara `checkExpiredEntities` em fire-and-forget (verifica promoções/cupons/destaques expirados e cria notificações).

## Testes

- `analytics.routes.test.ts` — registro de eventos, métricas
