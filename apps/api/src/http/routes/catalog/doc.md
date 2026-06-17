# routes/catalog/ — Produtos e categorias

CRUD de produtos e categorias do catálogo.

## Arquivos

### `catalog.routes.ts`

**Exporta:** `catalogPublicRoutes`, `catalogAdminRoutes`

**Rotas públicas** (`/api/lojas/:slug/products`):

| Rota | O que faz |
|------|-----------|
| `GET /` | Lista produtos com paginação e filtros (busca, categorias, preço, ordenação) |
| `GET /:id` | Detalhe de um produto |

**Rotas admin** (`/api/products`):

| Rota | preHandlers | O que faz |
|------|-------------|-----------|
| `GET /` | authenticate | Lista produtos da loja |
| `GET /options` | authenticate | Lista enxuta (id, nome, preço) para seletores |
| `GET /:id` | authenticate | Detalhe de um produto |
| `POST /` | authenticate, checkPlanLimit('maxProducts') | Cria produto com categorias e variantes |
| `PUT /:id` | authenticate | Atualiza produto (partial, recria categorias/variantes em transação) |
| `DELETE /:id` | authenticate | Remove produto (ownership pattern) |

**POST cria em transação:** produto + ProductCategory + ProductVariant. Valida que categoryIds pertencem à loja.

**PUT recria relações:** deleta categorias/variantes antigas e cria novas dentro de `$transaction`.

### `category.routes.ts`

**Exporta:** `categoryPublicRoutes`, `categoryAdminRoutes`

**Rotas públicas** (`/api/lojas/:slug/categories`):

| Rota | O que faz |
|------|-----------|
| `GET /` | Lista todas as categorias da loja (flat) |

**Rotas admin** (`/api/categories`):

| Rota | O que faz |
|------|-----------|
| `GET /` | Lista categorias |
| `POST /` | Cria categoria (com parentId opcional) |
| `PUT /:id` | Atualiza categoria |
| `DELETE /:id` | Remove categoria + descendentes (BFS via `collectDescendantIds`) |

**DELETE recursivo:** coleta IDs descendentes, deleta ProductCategory, depois deleta as categorias.

## Testes

- `catalog.routes.test.ts` — CRUD de produtos, paginação, filtros, ownership
