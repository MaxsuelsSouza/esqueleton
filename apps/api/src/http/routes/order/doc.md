# routes/order/ — Pedidos e clientes

Criação de pedidos e gestão de clientes.

## Arquivos

### `order.routes.ts`

**Exporta:** `orderPublicRoutes`, `orderAdminRoutes`

**Rotas públicas** (`/api/lojas/:slug/orders`):

| Rota | Rate limit | preHandlers | O que faz |
|------|-----------|-------------|-----------|
| `POST /` | 10/min | checkPlanLimit('maxOrdersPerMonth') | Cria pedido (valida aritmética, incrementa usedCount do cupom) |

O POST verifica a aritmética do pedido via `validateOrderArithmetic` — se os totais não batem, retorna 400. Incrementa `usedCount` do cupom (se usado) com scope na loja.

**Rotas admin** (`/api/orders`):

| Rota | O que faz |
|------|-----------|
| `GET /` | Lista pedidos da loja com paginação |
| `GET /:id` | Detalhe do pedido |
| `PATCH /:id` | Atualiza status do pedido (PENDING → SOLD / NOT_SOLD) |
| `DELETE /:id` | Remove pedido |

### `customer.routes.ts`

**Exporta:** `customerPublicRoutes`, `customerAdminRoutes`

**Rotas públicas** (`/api/lojas/:slug/customers`):

| Rota | Rate limit | O que faz |
|------|-----------|-----------|
| `POST /` | 10/min | Cria/atualiza cliente (upsert por `storeId_phone`) |

**Rotas admin** (`/api/customers`):

| Rota | O que faz |
|------|-----------|
| `GET /` | Lista clientes da loja |
| `GET /:id` | Detalhe do cliente com pedidos |
| `DELETE /:id` | Remove cliente |

**Unique composta:** `storeId_phone`. Cliente é criado/atualizado pelo telefone.

## Testes

- `order.routes.test.ts` — criação, validação aritmética, cupom
- `customer.routes.test.ts` — upsert, listagem
