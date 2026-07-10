# 08 — Billing, Planos e Assinaturas

[← Voltar ao início](00-inicio.md)

## O modelo "pagou, usou"

- Toda loja nasce com **7 dias de trial**, contados de `Store.createdAt` (`domain/billing/trial.ts` — `TRIAL_DIAS`, `trialStatus`). O cadastro **não cria assinatura** — o trial é implícito.
- Fora do trial e sem assinatura **ACTIVE**, o catálogo público responde **503 "Ops! Aconteceu um erro..."** — erro deliberadamente genérico para o cliente final nunca saber que é cobrança (o web mostra tela de erro cheia via `store-profile-context`).
- O **painel admin continua acessível** para o dono assinar.
- O plano gratuito foi **desativado** pela migração `20260613000000` (assinaturas gratuitas legadas continuam válidas). Cancelar (rota ou webhook) **não** re-assina em plano gratuito.

## Entidades

| Modelo | Escopo | Descrição |
|--------|--------|-----------|
| `Plan` | **Global** (sem `storeId`) | Plano da plataforma: slug único, `limits` (JSON), `priceInCents` (0 = gratuito), `billingPeriod`, `salesModality` (`ONLINE`/`PRESENCIAL`), `setupFeeInCents`. Gerido pelo super-admin. |
| `Subscription` | Por loja (tenant-scoped) | Assinatura da loja a um plano: `ACTIVE` / `PAUSED` / `CANCELLED` / `PENDING` / `PENDING_SETUP`. Guarda `setupFeeConfirmedAt` (planos PRESENCIAL). |

## Duas modalidades de venda (`Plan.salesModality`)

- **ONLINE** (padrão) — autoatendimento: o lojista se cadastra, escolhe o plano em `/admin/plano` ou `/admin/assinatura` e a cobrança recorrente começa imediatamente (ou no checkout do MercadoPago). É o fluxo "pagou, usou" descrito acima.
- **PRESENCIAL** — vendida por um representante da plataforma (`POST /api/super/stores`, já existente para esse fim). O plano define `setupFeeInCents` (ex: R$ 378,00), uma taxa única cobrada **manualmente/fora do sistema** (dinheiro, PIX na hora da venda — não passa pelo MercadoPago). Regras:
  - A loja nasce com uma `Subscription` em **`PENDING_SETUP`** — fica fora do ar mesmo dentro dos 7 dias de trial (o trial não vale para essa modalidade).
  - Quando o representante confirma que recebeu a implantação (`POST /api/super/stores/:id/confirm-setup-fee`), a assinatura vira **`ACTIVE`** na hora — a loja entra no ar imediatamente — e `setupFeeConfirmedAt` é gravado.
  - Nesse mesmo passo, se o plano for pago, cria-se a recorrência no MercadoPago com `auto_recurring.start_date` = confirmação + 30 dias — a mensalidade (ex: R$ 97,00) só é cobrada a partir do 30º dia. A rota devolve um `paymentLink` para o dono cadastrar o cartão.
  - Planos PRESENCIAL **não podem ser autoassinados**: `POST /api/billing/subscribe` rejeita com 400 se `plan.salesModality === 'PRESENCIAL'`. Também não usam `POST /:id/payment-link` (rejeitado com 400) — o fluxo de cobrança é sempre implantação manual → `confirm-setup-fee`.

## Limites de plano

`Plan.limits` (JSON) define: `maxProducts`, `maxUsers`, `maxOrdersPerMonth`.

O preHandler `app.checkPlanLimit('<limite>')` (`http/plugins/plan-limits.plugin.ts`) responde **403** quando o limite do plano ativo é atingido. Aplicado em:

| Rota | Limite |
|------|--------|
| `POST /api/products` | `maxProducts` |
| `POST /api/lojas/:slug/orders` | `maxOrdersPerMonth` (storeId vem do slug) |
| Registro em modo convite | `maxUsers` (imperativo, via `app.planLimitStatus`) |

**Regra de segurança:** sem assinatura ativa ou sem a chave de limite no JSON = **ilimitado** — o sistema nunca tranca uma loja por acidente.

Quando o uso atinge **80%** de um limite, `checkPlanLimit` faz upsert da notificação `PLAN_LIMIT_APPROACHING` (dedupada por `storeId+type+entityId`).

## Fluxo de assinatura (MercadoPago)

1. `POST /api/billing/subscribe` (**OWNER only**) — plano pago redireciona para o checkout MercadoPago (`init_point`); a assinatura fica **`PENDING`**.
2. O webhook `POST /api/webhooks/mercadopago` (validado por **HMAC** com `MERCADOPAGO_WEBHOOK_SECRET`) muda a assinatura para **`ACTIVE`** quando o pagamento é confirmado.
3. Falha de pagamento → webhook muda para **`PAUSED`** + notificação `SUBSCRIPTION_PAYMENT_FAILED`.
4. Cancelamento (rota `POST /api/billing/cancel` ou webhook) → **`CANCELLED`** + notificação `SUBSCRIPTION_CANCELLED`.

Sem `MERCADOPAGO_ACCESS_TOKEN`, as operações de pagamento são **no-ops** (dev). Adapter em `domain/billing/integrations/mercadopago.adapter.ts` (`app.mercadopago`).

## Páginas web

| Página | O quê |
|--------|-------|
| `/admin/plano` | plano atual, uso dos limites, troca/cancelamento (ações OWNER). Planos PRESENCIAL não aparecem na lista de "planos disponíveis" (autoatendimento). |
| `/admin/assinatura` | onboarding da ativação: teste de 7 dias, como funciona, assinar (OWNER). Mostra uma tela específica quando a assinatura está `PENDING_SETUP`. |
| `/admin/super/planos` | CRUD de planos — inclui a modalidade de venda e a taxa de implantação (só editável quando PRESENCIAL) |
| `/admin/super/lojas` | além de criar loja/gerar link, mostra a badge "Aguardando implantação" e a ação "Confirmar implantação" para assinaturas `PENDING_SETUP` |

## Notificações de billing

Todas fire-and-forget, dedupadas pelo unique `storeId+type+entityId`:

- `PLAN_LIMIT_APPROACHING` — 80% de um limite (entityId = chave do limite)
- `SUBSCRIPTION_PAYMENT_FAILED` — webhook → PAUSED
- `SUBSCRIPTION_CANCELLED` — webhook → CANCELLED

## Próxima página

→ [09 — Super Admin](09-super-admin.md)
