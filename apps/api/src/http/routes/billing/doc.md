# routes/billing/ — Planos e assinatura

Listagem de planos e gestão de assinatura da loja.

## Arquivos

### `billing.routes.ts`

**Exporta:** `billingPublicRoutes`, `billingAdminRoutes`

**Rotas públicas** (`/api/billing`):

| Rota | O que faz |
|------|-----------|
| `GET /plans` | Lista planos ativos da plataforma (sem auth) |

**Rotas admin** (`/api/billing`):

| Rota | Auth | preHandlers | O que faz |
|------|------|-------------|-----------|
| `GET /current` | JWT | — | Retorna assinatura atual da loja (com plano, uso, trial status e `storeAvailable`) |
| `POST /subscribe` | JWT | requireOwner | Cria assinatura + redireciona para checkout MercadoPago |
| `POST /cancel` | JWT | requireOwner | Cancela assinatura (MercadoPago + banco) |

**Fluxo de subscribe:**
1. Rejeita planos `salesModality === 'PRESENCIAL'` (400) — esses só são vendidos por um representante via `POST /api/super/stores` + `confirm-setup-fee`
2. Verifica se já tem assinatura ACTIVE/PENDING
3. Busca plano no banco
4. Cria `Subscription` com status `PENDING`
5. Chama `app.mercadopago.createSubscription` → retorna `initPoint`
6. Frontend redireciona lojista para `initPoint` (checkout MercadoPago)
7. Webhook confirma pagamento → status vira `ACTIVE`

**`storeAvailable`** em `/current` reusa `isStoreAvailable` (mesma regra do catálogo público): assinatura ACTIVE, ou dentro do trial de 7 dias — exceto se houver uma assinatura `PENDING_SETUP` (venda presencial aguardando confirmação da implantação), que bloqueia o trial.

**Fluxo de cancel:**
1. Busca assinatura ativa
2. Chama `app.mercadopago.cancelSubscription`
3. Atualiza status para `CANCELLED`

**Sem `MERCADOPAGO_ACCESS_TOKEN`:** operações de pagamento são no-op (retornam null).

## Testes

- `billing.routes.test.ts` — bloqueio de planos PRESENCIAL no autoatendimento, `storeAvailable` em `/current`
