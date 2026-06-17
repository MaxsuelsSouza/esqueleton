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
| `PATCH /:id` | Atualiza status (ACTIVE/SUSPENDED) ou plano da loja |

### `plans.routes.ts`

**Exporta:** `superPlansRoutes` (prefixo `/api/super/plans`)

| Rota | O que faz |
|------|-----------|
| `GET /` | Lista todos os planos |
| `POST /` | Cria plano (com criação de preapproval plan no MercadoPago) |
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
