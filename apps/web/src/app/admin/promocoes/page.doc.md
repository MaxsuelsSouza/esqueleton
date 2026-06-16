# Promocoes

Pagina de gestao de promocoes com CRUD, reordenacao por drag-and-drop e toggle de ativacao.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza a lista de promocoes como cards (com posicao, nome, tipo, status, regra de desconto, produtos selecionados, restricoes de tempo e acoes). Contem o modal de formulario com secoes de identificacao, beneficio, produtos e validade. Sub-componentes: PromotionCard, PromotionModal, CategoryCheckboxTree, ProductSelector, StatusBadge, Section, Modal. |
| `page.hooks.ts` | Carrega promocoes, produtos e categorias da API. Gerencia abertura de modais, validacao e envio do formulario, exclusao, toggle de ativo/inativo, e drag-and-drop para reordenacao de prioridade. |

## Fluxo de dados

1. `usePromocoesPage()` chama em paralelo: `promotionsService.listPromotions`, `catalogService.listProductOptions`, `categoriesService.listCategories` → monta a arvore de categorias com `buildCategoryTree`.
2. Ao salvar, o hook resolve os `productIds` conforme o modo de restricao (todos, por categorias expandidas, ou por produtos especificos) e chama `promotionsService.createPromotion` ou `updatePromotion`.
3. Ao arrastar e soltar, reordena localmente para feedback imediato e persiste com `promotionsService.reorderPromotions`.

## Estados gerenciados

| Estado | Tipo | Descricao |
|--------|------|-----------|
| `promotions` | `Promotion[]` | Lista de promocoes ordenadas por prioridade |
| `products` | `ProductOption[]` | Lista de produtos para selecao |
| `categoryTree` | `Category[]` | Arvore de categorias para filtro por categoria |
| `restrictionMode` | `'all' \| 'categories' \| 'products'` | Modo de restricao de produtos |
| `selectedCategoryIds` | `string[]` | Categorias selecionadas (expandidas para productIds ao salvar) |
| `modalOpen` | `boolean` | Modal de criar/editar aberto |
| `editingPromotion` | `Promotion \| null` | Promocao sendo editada |
| `form` | `PromotionFormData` | Dados do formulario |
| `formError` | `string \| null` | Erro de validacao |
| `isSaving` | `boolean` | Salvamento em andamento |
| `hasTimeWindow` | `boolean` | Toggle de restricao de horario |
| `hasDateRange` | `boolean` | Toggle de periodo de vigencia |
| `hasColor` | `boolean` | Toggle de borda colorida no catalogo |
| `deletingPromotion` | `Promotion \| null` | Promocao selecionada para exclusao |
| `isDeleting` | `boolean` | Exclusao em andamento |
| `dragOverIndex` | `number \| null` | Indice do item sobre o qual o arraste esta passando |

## Acoes do usuario

| Acao | Handler | O que faz |
|------|---------|-----------|
| Clicar "Nova promocao" | `openCreateModal` | Abre modal com formulario vazio |
| Clicar editar | `openEditModal` | Abre modal preenchido com dados da promocao |
| Salvar promocao | `handleSave` | Valida nome, resolve productIds e chama create/update |
| Excluir promocao | `handleDelete` | Remove a promocao da API |
| Toggle ativo/inativo | `toggleActive` | Inverte o campo `active` via API |
| Arrastar card | `handleDragStart/Over/End/Drop` | Reordena prioridade localmente e persiste no servidor |

## Modulos utilizados

- `@/modules/promotions/services/promotions.service` — CRUD e reordenacao de promocoes
- `@/modules/catalog/services/catalog.service` — `listProductOptions` para o seletor de produtos
- `@/modules/categories/services/categories.service` — listar categorias
- `@/modules/categories/utils/categories` — `buildCategoryTree`, `flattenCategories`, `expandSelectedCategories`
- Mocks de promotions, catalog e categories (quando `USE_MOCK_DATA = true`)

## Observacoes

- A flag `USE_MOCK_DATA` esta `false`.
- O tipo de promocao (percentage, fixed, buy_x_get_y, kit, custom) e apenas um rotulo visual — nao restringe quais campos estao disponiveis.
- A posicao da promocao na lista define sua prioridade (a primeira tem prioridade sobre as demais).
- O modo de restricao por categorias expande as subcategorias automaticamente (BFS) para coletar todos os produtos filhos.
- A cor da borda e aplicada nos cards do catalogo publico e pode ser predefinida ou personalizada.
