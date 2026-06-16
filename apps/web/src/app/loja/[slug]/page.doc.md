# Catalogo Publico da Loja

Pagina principal da loja publica que exibe o catalogo completo de produtos com filtros, busca, ordenacao, paginacao e secao de destaques.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza o layout responsivo do catalogo: barra de busca/filtros mobile, sidebar de filtros desktop, secao em destaque, grade/lista de produtos, paginacao e estados vazios/carregamento. Inclui sub-componentes internos `Pagination`, `ProductGrid`, `ProductSkeleton` e `EmptyState`. |
| `page.hooks.ts` | Carrega produtos (paginados), categorias, promocoes e secoes em destaque via services publicos. Aplica promocoes aos produtos, gerencia filtros/paginacao e calcula dados derivados (contagem de filtros ativos, produtos promovidos). |

## Fluxo de dados

`useStoreSlug()` extrai o slug da URL → carrega categorias, promocoes e destaques em paralelo (uma vez) → `catalogService.listPublicProducts(slug, { page, search, categoryIds, priceMin, priceMax, sortBy })` busca produtos sempre que filtros ou pagina mudam → `applyPromotionsToProducts` aplica descontos das promocoes ativas → `getActiveFeatured` seleciona a secao em destaque ativa → `catalogService.getPublicProductsByIds` busca produtos da secao em destaque → dados chegam a view como `promotedProducts`, `promotedFeatured`, `activeFeatured`.

## Estados gerenciados

| Estado | Tipo | Descricao |
|--------|------|-----------|
| `products` | `Product[]` | Produtos da pagina atual (crus, antes de promocoes) |
| `total` | `number` | Total de produtos encontrados |
| `totalPages` | `number` | Total de paginas |
| `page` | `number` | Pagina atual |
| `categories` | `Category[]` | Arvore de categorias da loja |
| `promotions` | `Promotion[]` | Promocoes ativas da loja |
| `featuredSections` | `Featured[]` | Secoes em destaque da loja |
| `featuredProducts` | `Product[]` | Produtos da secao em destaque ativa |
| `isLoading` | `boolean` | Carregamento de produtos |
| `error` | `string \| null` | Erro ao carregar produtos |
| `filters` | `CatalogFilters` | Filtros ativos (busca, categorias, preco, ordenacao) |
| `displayMode` | `DisplayMode` | Modo de exibicao: `grid` ou `list` |
| `filtersOpen` | `boolean` | Painel de filtros aberto no mobile |

## Acoes do usuario

| Acao | Handler | O que faz |
|------|---------|-----------|
| Digitar na busca | `handleSearchChange` | Filtra produtos por texto e volta para a pagina 1 |
| Alterar filtros (categoria, preco, ordenacao) | `handleFiltersChange` | Atualiza filtros e volta para a pagina 1 |
| Clicar "Limpar" filtros | `clearFilters` | Remove todos os filtros exceto o texto de busca |
| Alternar grade/lista | `handleDisplayChange` | Muda o modo de exibicao dos produtos |
| Abrir/fechar filtros mobile | `setFiltersOpen` | Alterna visibilidade do painel de filtros |
| Navegar entre paginas | `handlePageChange` | Muda a pagina e rola para o topo suavemente |

## Modulos utilizados

- `@/shared/hooks/useStoreSlug` — extrai o slug da URL
- `@/modules/catalog/services/catalog.service` — `listPublicProducts`, `getPublicProductsByIds`
- `@/modules/catalog/components/CatalogSearch` — campo de busca
- `@/modules/catalog/components/CatalogFilters` — painel de filtros (categorias, preco, ordenacao)
- `@/modules/catalog/components/DisplayToggle` — alternador grade/lista
- `@/modules/catalog/components/ProductCard` — cartao de produto
- `@/modules/categories/services/categories.service` — `listPublicCategories`
- `@/modules/categories/utils/categories` — `expandSelectedCategories`, `buildCategoryTree`
- `@/modules/promotions/services/promotions.service` — `listPublicPromotions`
- `@/modules/promotions/utils/promotions` — `applyPromotionsToProducts`
- `@/modules/featured/services/featured.service` — `listPublicFeatured`
- `@/modules/featured/utils/featured` — `getActiveFeatured`
- `@/modules/featured/components/FeaturedSection` — secao de destaque

## Observacoes

- A secao em destaque so aparece na primeira pagina e quando nao ha filtros ativos.
- As categorias selecionadas sao expandidas para incluir subcategorias antes de enviar a API (`expandSelectedCategories`).
- O `activeFilterCount` nao inclui a busca por texto (ja tem botao X no campo), apenas categorias, preco e ordenacao.
- O sub-componente `Pagination` gera numeros de pagina inteligentes com reticencias para listas longas.
- A cor do botao de pagina ativa usa a variavel CSS `--color-primary` do tema da loja.
