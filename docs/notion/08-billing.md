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

## Fluxo de assinatura (MercadoPago)

1. `POST /api/billing/subscribe` (**OWNER only**) — plano pago redireciona para o checkout MercadoPago (`init_point`); a assinatura fica **`PENDING`**.
2. O webhook `POST /api/webhooks/mercadopago` (validado por **HMAC** com `MERCADOPAGO_WEBHOOK_SECRET`) muda a assinatura para **`ACTIVE`** quando o pagamento é confirmado.
3. Falha de pagamento → webhook muda para **`PAUSED`** + notificação `SUBSCRIPTION_PAYMENT_FAILED`.
4. Cancelamento (rota `POST /api/billing/cancel` ou webhook) → **`CANCELLED`** + notificação `SUBSCRIPTION_CANCELLED`.

Sem `MERCADOPAGO_ACCESS_TOKEN`, as operações de pagamento são **no-ops** (dev). Adapter em `domain/billing/integrations/mercadopago.adapter.ts` (`app.mercadopago`).

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
