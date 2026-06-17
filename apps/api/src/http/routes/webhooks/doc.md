# routes/webhooks/ — Webhooks externos

Recebimento de notificações de serviços externos.

## Arquivos

### `mercadopago.routes.ts`

**Exporta:** `webhookRoutes` (prefixo `/api/webhooks`)

| Rota | O que faz |
|------|-----------|
| `POST /mercadopago` | Recebe notificação de pagamento do MercadoPago |

**Validação HMAC:** verifica a assinatura do webhook usando `MERCADOPAGO_WEBHOOK_SECRET`. Requisições com assinatura inválida recebem 401.

**Eventos tratados:**
- Pagamento aprovado → `Subscription.status = 'ACTIVE'`
- Pagamento falhou → `Subscription.status = 'PAUSED'` + notificação `SUBSCRIPTION_PAYMENT_FAILED`
- Assinatura cancelada → `Subscription.status = 'CANCELLED'` + notificação `SUBSCRIPTION_CANCELLED`

**Usa `app.prismaRaw`** — o webhook não tem contexto de loja (não é uma requisição de admin).

**Sempre retorna 200** — mesmo em caso de erro de processamento (MercadoPago reenvia se receber erro).

## Testes

- `mercadopago.test.ts` — HMAC, eventos de pagamento
