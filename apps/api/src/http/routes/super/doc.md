# routes/super/ — Gestão da plataforma (super-admin)

Rotas exclusivas do administrador da plataforma. Todas exigem `app.authenticate` + `requireSuperAdmin`.

**Usam `app.prismaRaw`** (sem tenant guard) — queries são cross-store por design.

## Arquivos

### `stores.routes.ts`

**Exporta:** `superStoresRoutes` (prefixo `/api/super/stores`)

| Rota | O que faz |
|------|-----------|
| `GET /` | Lista todas as lojas com busca, paginação e filtro por status |
| `GET /:id` | Detalhe da loja (com perfil, assinatura, contagens) |
| `POST /` | Venda presencial: cria loja + dono + assinatura em um passo (plano ONLINE gera link MercadoPago; plano PRESENCIAL nasce `PENDING_SETUP`, sem link) |
| `POST /:id/payment-link` | Gera/regenera o link de pagamento MercadoPago de uma loja existente — só para planos ONLINE |
| `POST /:id/confirm-setup-fee` | Confirma a taxa de implantação (cobrada manualmente) de um plano PRESENCIAL — ativa a loja na hora e cria a recorrência no MercadoPago com a 1ª cobrança em 30 dias |
| `PATCH /:id` | Atualiza status (ACTIVE/SUSPENDED) ou plano da loja |

### `plans.routes.ts`

**Exporta:** `superPlansRoutes` (prefixo `/api/super/plans`)

| Rota | O que faz |
|------|-----------|
| `GET /` | Lista todos os planos |
| `POST /` | Cria plano — planos ONLINE pagos ganham preapproval plan no MercadoPago; `salesModality`/`setupFeeInCents` definem a modalidade PRESENCIAL |
| `PUT /:id` | Atualiza plano |
| `DELETE /:id` | Remove plano (bloqueado se há assinaturas ACTIVE/PENDING/PAUSED) |

**Desativação bloqueada:** não permite deletar plano com assinaturas ativas.

### `users.routes.ts`

**Exporta:** `superUsersRoutes` (prefixo `/api/super/users`)

| Rota | O que faz |
|------|-----------|
| `GET /` | Lista todos os usuários da plataforma (com loja e role) |

### `metrics.routes.ts`

**Exporta:** `superMetricsRoutes` (prefixo `/api/super/metrics`)

| Rota | O que faz |
|------|-----------|
| `GET /` | Totais da plataforma: lojas, usuários, MRR, assinaturas por plano |

**MRR (Monthly Recurring Revenue):** soma `priceInCents` de assinaturas ativas, convertendo anuais (÷12).

## Testes

- `stores.test.ts` — CRUD de lojas, suspensão, troca de plano
