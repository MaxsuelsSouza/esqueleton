# 05 — Catálogo

[← Voltar ao início](00-inicio.md)

## Produtos

Modelo `Product`: `brand`, `name`, `description`, `price`, `imageUrl`, além de `variants` e `characteristics` (tipos em `packages/shared`).

### Admin (`/api/products`, JWT)

- CRUD completo com upload de foto (galeria ou câmera) na página `/admin/produtos`.
- `POST /api/products` passa pelo preHandler `checkPlanLimit('maxProducts')` — 403 quando o limite do plano é atingido (ver [Billing](08-billing.md)).
- POST/PUT chamam `uploadImage`/`uploadImages` antes de salvar (R2 em produção — ver [Imagens](10-imagens-r2.md)).
- DELETE dispara `deleteByPrefix` no R2 (fire-and-forget) para limpar as imagens do produto.
- CRUD também dispara a sincronização com o catálogo WhatsApp quando habilitada (ver [WhatsApp Catalog](11-whatsapp-catalog.md)).

### Público (`/api/lojas/:slug/products`)

- Listagem com filtros e paginação (`listarProdutos` em `domain/catalog/services/product.service.ts`).
- Sempre filtrado pela loja do slug (`request.store.id`).

## Categorias em árvore

`Category` é **auto-referencial** (`parentId` → relação `CategoryTree`), suportando árvore de qualquer profundidade. `ProductCategory` é a junção many-to-many com produtos.

### Utilidades (web, `utils/categories.ts`)

| Função | O que faz |
|--------|-----------|
| `flattenCategories(tree)` | árvore → lista plana |
| `buildCategoryTree(flat)` | lista plana → árvore |
| `expandSelectedCategories(ids, all)` | expande seleção para incluir todos os descendentes (usado no filtro do catálogo) |

### Exclusão em cascata

`collectDescendantIds` (`domain/catalog/services/category.service.ts`) faz **BFS** na árvore para apagar uma categoria junto com todas as descendentes.

### Admin

`/admin/categorias` — árvore interativa com criar/editar/excluir.

## Catálogo público (a página da loja)

`apps/web/src/app/loja/[slug]/page.tsx` aplica as transformações **nesta ordem**:

1. **Promoções** (`applyPromotionsToProducts`) — modifica preços e adiciona badge de desconto.
2. **Cupom** (`applyCouponToProduct`) — sobrescreve o preço dos produtos elegíveis.
3. **Filtros e ordenação** — aplicados sobre o resultado final.

Componentes principais (`components/catalog/`):

| Componente | Papel |
|------------|-------|
| `ProductCard` | cartão de produto (grade e lista) — marca, nome, preço |
| `ProductPrice` | preço com desconto e porcentagem |
| `CatalogToolbar` | busca + filtros + alternador grade/lista |
| `CatalogFilters` | árvore de categorias, faixa de preço, ordenação |
| `FeaturedSection` | seção "Em destaque" no topo |

## Páginas públicas da loja

| Rota | O quê |
|------|-------|
| `/loja/[slug]` | catálogo com filtros e busca |
| `/loja/[slug]/produto/[id]` | detalhe do produto |
| `/loja/[slug]/sacola` | sacola + envio pelo WhatsApp |
| `/loja/[slug]/favoritos` | produtos favoritados |

## Dados de exemplo (mocks)

Páginas que carregam dados têm uma flag `USE_MOCK_DATA` no topo — **todas em `false`** (o web fala com a API real). Os mocks (`apps/web/src/mocks/`) servem para desenvolvimento sem API; com mocks ligados, o slug é ignorado.

## Próxima página

→ [06 — Precificação](06-precificacao.md)
