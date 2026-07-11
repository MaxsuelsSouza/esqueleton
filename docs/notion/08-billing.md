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
| `Plan` | **Global** (sem `storeId`) | Plano da plataforma: slug único, `limits` (JSON), `priceInCents` (0 = gratuito), `billingPeriod`. Gerido pelo super-admin. |
| `Subscription` | Por loja (tenant-scoped) | Assinatura da loja a um plano: `ACTIVE` / `PAUSED` / `CANCELLED` / `PENDING`. |

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

## Fluxo de assinatura (Stripe)

1. `POST /api/billing/subscribe` (**OWNER only**) — plano pago redireciona para o checkout Stripe (`session.url`); a assinatura fica **`PENDING`**.
2. O webhook `POST /api/webhooks/stripe` (validado pela assinatura do Stripe com `STRIPE_WEBHOOK_SECRET`) muda a assinatura para **`ACTIVE`** quando o pagamento é confirmado.
3. Falha de pagamento → webhook muda para **`PAUSED`** + notificação `SUBSCRIPTION_PAYMENT_FAILED` + **e-mail imediato** ao OWNER (`subscriptionPaymentFailedEmail`).
4. Cancelamento (rota `POST /api/billing/cancel` ou webhook) → **`CANCELLED`** + notificação `SUBSCRIPTION_CANCELLED`.

Sem `STRIPE_SECRET_KEY`, as operações de pagamento são **no-ops** (dev). Adapter em `domain/billing/integrations/stripe.adapter.ts` (`app.stripe`).

## Cobrança fixa no dia 10

- A cobrança recorrente acontece **sempre no dia 10**. O checkout coleta o cartão (`payment_method_collection: 'always'`), mas o **primeiro débito é ancorado no dia 10 do mês seguinte** ao cadastro (`domain/billing/billing-cycle.ts` → `proximoDiaDezUnix`, passado em `subscription_data.trial_end`). O mês vigente **não** é cobrado.
- Na âncora, `checkout.session.completed` chega com `payment_status: 'no_payment_required'` — a loja é ativada (a par de `'paid'`). `'unpaid'` (boleto/Pix) fica **`PENDING`** até compensar.
- **Inadimplência:** `invoice.payment_failed` → `PAUSED` (loja sai do ar) + e-mail ao lojista + banner no admin "Pagamento não efetuado — sua loja está desativada" com atalho para `/admin/plano`.
- **Cron de reconciliação:** `GET /api/jobs/verificar-assinaturas` (auth `CRON_SECRET`, agendado `0 4 10 * *` no `vercel.json`) consulta o status real de cada assinatura no Stripe e corrige o banco — rede de segurança caso um webhook se perca.

## Histórico de faturas

`GET /api/billing/invoices?startingAfter=<id>` (admin) lista as faturas do `stripeCustomerId` da loja, com paginação por cursor do Stripe (`hasMore` habilita "Carregar mais"). Sem Customer → lista vazia. A seção **Faturas** em `/admin/plano` mostra Data / Total / Status e o link "Ver" abre o invoice hospedado do Stripe (`hostedInvoiceUrl`).

## Páginas web

| Página | O quê |
|--------|-------|
| `/admin/plano` | plano atual, uso dos limites, troca/cancelamento (ações OWNER) |
| `/admin/assinatura` | onboarding da ativação: teste de 7 dias, como funciona, assinar (OWNER) |

## Notificações de billing

Todas fire-and-forget, dedupadas pelo unique `storeId+type+entityId`:

- `PLAN_LIMIT_APPROACHING` — 80% de um limite (entityId = chave do limite)
- `SUBSCRIPTION_PAYMENT_FAILED` — webhook → PAUSED
- `SUBSCRIPTION_CANCELLED` — webhook → CANCELLED

## Próxima página

→ [09 — Super Admin](09-super-admin.md)
