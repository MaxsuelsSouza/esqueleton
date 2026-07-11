# routes/webhooks/ — Webhooks externos

Recebimento de notificações de serviços externos.

## Arquivos

### `stripe.routes.ts`

**Exporta:** `webhookRoutes` (prefixo `/api/webhooks`)

| Rota | O que faz |
|------|-----------|
| `POST /stripe` | Recebe notificação de pagamento/assinatura do Stripe |

**Corpo bruto:** o plugin registra um `contentTypeParser` encapsulado (`parseAs: 'buffer'`) só para estas rotas — o Stripe valida a assinatura sobre os bytes originais do corpo, então não pode passar pelo parser JSON global.

**Validação de assinatura:** `app.stripe.constructWebhookEvent(rawBody, signature)` usa `STRIPE_WEBHOOK_SECRET`. Assinatura inválida recebe 401. Sem o secret (dev), o corpo é parseado como JSON direto.

**Eventos tratados:**
- `checkout.session.completed` → salva `stripeSubscriptionId` na assinatura (encontrada pelo `client_reference_id`) e `stripeCustomerId` na loja. **Ativa (`ACTIVE`) quando `payment_status` é `paid` (cartão) ou `no_payment_required` (âncora do dia 10 / trial)**; boleto/Pix chegam como `unpaid` e ficam `PENDING` até `customer.subscription.updated` confirmar — evita janela de acesso grátis antes da compensação
- `customer.subscription.updated` → mapeia o status do Stripe (`active`/`trialing`/`past_due`/`canceled`/`incomplete`) para o nosso; `past_due`/`unpaid` gera notificação `SUBSCRIPTION_PAYMENT_FAILED`
- `customer.subscription.deleted` → `Subscription.status = 'CANCELLED'` + notificação `SUBSCRIPTION_CANCELLED`
- `invoice.payment_failed` → `Subscription.status = 'PAUSED'` + notificação `SUBSCRIPTION_PAYMENT_FAILED` + **e-mail imediato ao OWNER** (`subscriptionPaymentFailedEmail`, fire-and-forget)

**Usa `app.prismaRaw`** — o webhook não tem contexto de loja (não é uma requisição de admin); localiza a assinatura pelo ID externo.

**Sempre retorna 200** — mesmo quando não encontra a assinatura ou o evento não é tratado (o Stripe reenvia se receber erro).

## Testes

- `stripe.test.ts` — verificação de assinatura, transições de status, notificações
