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
| `GET /subscription` | JWT | — | Retorna assinatura atual da loja (com plano e trial status) |
| `POST /subscribe` | JWT | requireOwner | Cria assinatura + redireciona para checkout MercadoPago |
| `POST /cancel` | JWT | requireOwner | Cancela assinatura (MercadoPago + banco) |

**Fluxo de subscribe:**
1. Verifica se já tem assinatura ACTIVE/PENDING
2. Busca plano no banco
3. Cria `Subscription` com status `PENDING`
4. Chama `app.mercadopago.createSubscription` → retorna `initPoint`
5. Frontend redireciona lojista para `initPoint` (checkout MercadoPago)
6. Webhook confirma pagamento → status vira `ACTIVE`

**Fluxo de cancel:**
1. Busca assinatura ativa
2. Chama `app.mercadopago.cancelSubscription`
3. Atualiza status para `CANCELLED`

**Sem `MERCADOPAGO_ACCESS_TOKEN`:** operações de pagamento são no-op (retornam null).
