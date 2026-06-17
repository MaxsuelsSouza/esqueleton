# domain/billing/ — Trial e MercadoPago

Período de teste e integração com o gateway de pagamento.

## Arquivos

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

### `integrations/mercadopago.adapter.ts`

Plugin Fastify que registra `app.mercadopago`. **Sem `MERCADOPAGO_ACCESS_TOKEN`, opera em modo no-op** (loga mas não executa).

**Interface `MercadoPagoService`:**

| Método | O que faz | Retorna |
|--------|-----------|---------|
| `createPlan(params)` | Cria plano de recorrência no MercadoPago | `{ id, initPoint }` ou `null` |
| `createSubscription(params)` | Cria assinatura vinculada a um plano | `{ id, initPoint }` ou `null` |
| `cancelSubscription(id)` | Cancela assinatura existente | `boolean` |
| `isConfigured` | Se o MercadoPago está configurado | `boolean` |

**`createPlan`:** converte `amountInCents` para reais (÷ 100), período `MONTHLY` = frequência 1 mês, `YEARLY` = 12 meses.

**`createSubscription`:** redireciona o lojista para o checkout via `initPoint`. A assinatura fica `PENDING` até o webhook confirmar pagamento.

**`cancelSubscription`:** atualiza status para `cancelled` no MercadoPago. Retorna `false` se der erro (logado mas não lançado).

## Fluxo de assinatura

```
Lojista clica "Assinar" no painel
  → POST /api/billing/subscribe { planId }
  → app.mercadopago.createSubscription(...)
  → retorna { initPoint } (URL do checkout MercadoPago)
  → lojista é redirecionado para pagar
  → MercadoPago envia webhook
  → POST /api/webhooks/mercadopago (HMAC validado)
  → atualiza Subscription.status para ACTIVE
  → loja pública volta a funcionar
```

## Variáveis de ambiente

- `MERCADOPAGO_ACCESS_TOKEN` — token de acesso da API MercadoPago (opcional)
- `MERCADOPAGO_WEBHOOK_SECRET` — secret para validar HMAC dos webhooks (opcional)
