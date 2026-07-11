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
| `GET /current` | JWT | — | Retorna assinatura atual da loja (com plano, uso e trial status) |
| `GET /invoices` | JWT | — | Histórico de faturas reais do Stripe (paginação por cursor `startingAfter`) |
| `POST /subscribe` | JWT | requireOwner | Cria assinatura + redireciona para o Checkout do Stripe |
| `POST /cancel` | JWT | requireOwner | Cancela assinatura (Stripe + banco) |

**Cobrança fixa no dia 10:** o `subscribe` passa `trialEnd` (`proximoDiaDezUnix`) ao checkout — o cartão é coletado agora, mas o primeiro débito é no dia 10 do mês seguinte (não cobra o mês vigente). Ver `domain/billing/billing-cycle.ts`.

**Faturas:** `GET /invoices` retorna **apenas** as faturas reais do Stripe (`app.stripe.listInvoices`) — nada sintético/derivado do banco. Sem `stripeCustomerId` na loja (nunca fez checkout pago) → lista vazia, e o front mostra a mensagem "Nenhuma fatura ainda". Datas convertidas de unix para ISO; o front formata em pt-BR.

**Fluxo de subscribe:**
1. Verifica se já tem assinatura ACTIVE (cancela a anterior no Stripe)
2. Busca plano no banco
3. Plano gratuito: cria `Subscription` ACTIVE direto, sem checkout
4. Plano pago: cria `Subscription` com status `PENDING`
5. Cria uma Checkout Session no Stripe (reaproveita `Store.stripeCustomerId` se existir) → retorna `checkoutUrl`
6. Frontend redireciona o lojista para `checkoutUrl` (Checkout hospedado do Stripe)
7. Webhook `checkout.session.completed` confirma → status vira `ACTIVE`

**Fluxo de cancel:**
1. Busca assinatura ativa
2. Chama `app.stripe.cancelSubscription`
3. Atualiza status para `CANCELLED`

**Sem `STRIPE_SECRET_KEY`:** operações de pagamento são no-op (retornam null; a assinatura fica PENDING sem checkout).
