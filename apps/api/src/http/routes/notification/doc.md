# routes/notification/ — Notificações do admin

Notificações automáticas exibidas no painel do lojista.

## Arquivos

### `notification.routes.ts`

**Exporta:** `notificationRoutes` (prefixo `/api/notifications`, somente admin)

| Rota | Auth | O que faz |
|------|------|-----------|
| `GET /` | JWT | Lista notificações da loja (ordenadas por data, mais recentes primeiro) |
| `PATCH /:id` | JWT | Atualiza status (PENDING → READ / DISMISSED) |

**Tipos de notificação (criados automaticamente):**
- `PROMOTION_ENDED` — promoção expirou
- `COUPON_ENDED` — cupom expirou ou atingiu limite
- `FEATURED_ENDED` — destaque expirou
- `PLAN_LIMIT_APPROACHING` — 80% do limite do plano
- `SUBSCRIPTION_PAYMENT_FAILED` — pagamento falhou
- `SUBSCRIPTION_CANCELLED` — assinatura cancelada

Não tem rotas públicas — notificações são visíveis apenas no painel admin.
