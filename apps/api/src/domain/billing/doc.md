# domain/billing/ — Trial, ciclo de cobrança e Stripe

Período de teste, âncora de cobrança e integração com o gateway de pagamento.

## Arquivos

### `billing-cycle.ts`

Regra do ciclo de cobrança — a cobrança acontece **sempre no dia 10**.

| Export | O que faz |
|--------|-----------|
| `DIA_DA_COBRANCA` | Constante: `10` |
| `proximoDiaDezUnix(from)` | **Autocadastro público** — dia 10 do mês seguinte ao cadastro (unix, meio-dia UTC) |
| `primeiroDebitoVendaPresencial(from)` | **Venda presencial (super-admin)** — 30 dias de carência a partir da compra e então o próximo dia 10 |

O retorno é passado como `trial_end` no checkout: o cartão é coletado agora, mas o mês vigente não é cobrado — o débito começa na data ancorada e recorre mensalmente no dia 10.

**Diferença entre os fluxos:**
- Autocadastro: assina em qualquer dia → 1º débito no dia 10 do mês seguinte.
- Venda presencial: 30 dias de carência e então o próximo dia 10. Ex.: compra em 20/jul → +30 dias ≈ 19/ago → como já passou do dia 10 de agosto, o débito fica ancorado em **10/set**.

### `trial.ts`

Constantes e cálculo do período de teste.

| Export | O que faz |
|--------|-----------|
| `TRIAL_DIAS` | Constante: `7` |
| `TRIAL_MS` | Constante: 7 dias em milissegundos |
| `trialStatus(storeCreatedAt)` | Calcula situação do trial |

**`trialStatus` retorna:**
```typescript
{
  endsAt: Date,      // data de término do trial
  active: boolean,   // true se ainda está dentro do período
  daysLeft: number,  // dias restantes (arredondado para cima)
}
```

### `integrations/stripe.adapter.ts`

Plugin Fastify que registra `app.stripe`. **Sem `STRIPE_SECRET_KEY`, opera em modo no-op** (loga mas não executa). O SDK do Stripe é carregado sob demanda (import dinâmico) — só quando há credencial, para não pesar o boot/testes sem credencial.

**Interface `StripeService`:**

| Método | O que faz | Retorna |
|--------|-----------|---------|
| `createProductWithPrice(params)` | Cria Product + Price recorrente no Stripe | `{ productId, priceId }` ou `null` |
| `createCheckoutSession(params)` | Cria a sessão de checkout (modo assinatura, com `trial_end` = âncora do dia 10 e `payment_method_collection: 'always'`) | `{ id, url }` ou `null` |
| `cancelSubscription(id)` | Cancela assinatura existente | `boolean` |
| `getSubscriptionStatus(id)` | Consulta o status atual da assinatura (reconciliação do cron) | `string` ou `null` |
| `listInvoices(params)` | Lista faturas do Customer (paginação por cursor `startingAfter`) | `{ data: StripeInvoice[], hasMore }` |
| `constructWebhookEvent(rawBody, signature)` | Valida e desserializa o evento do webhook | `Stripe.Event` ou `null` |
| `isConfigured` | Se a chave secreta está presente | `boolean` |
| `webhookConfigured` | Se o secret de webhook está presente | `boolean` |

**`createProductWithPrice`:** cria um Product e um Price recorrente (`unit_amount` em centavos, `interval` `month` ou `year`). O Price é imutável — mudança de valor recria um novo.

**`createCheckoutSession`:** liga a sessão à nossa Subscription pelo `client_reference_id`. Reaproveita o `customerId` da loja quando existe; senão o Stripe cria um Customer a partir do e-mail. A assinatura fica `PENDING` até o webhook confirmar.

**`cancelSubscription`:** cancela a assinatura recorrente no Stripe. Retorna `false` se der erro (logado, não lançado).

## Fluxo de assinatura

```
Lojista clica "Assinar" no painel
  → POST /api/billing/subscribe { planId }
  → app.stripe.createCheckoutSession(...)
  → retorna { url } (URL do Checkout do Stripe)
  → lojista é redirecionado para pagar
  → Stripe envia webhook checkout.session.completed
  → POST /api/webhooks/stripe (assinatura validada)
  → atualiza Subscription.status para ACTIVE + salva stripeSubscriptionId/stripeCustomerId
  → loja pública volta a funcionar
```

## Variáveis de ambiente

- `STRIPE_SECRET_KEY` — chave secreta da API do Stripe (opcional em dev, obrigatória em produção)
- `STRIPE_WEBHOOK_SECRET` — secret para validar a assinatura dos webhooks (opcional em dev)
