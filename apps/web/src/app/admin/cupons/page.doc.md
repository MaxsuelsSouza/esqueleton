# Cupons

Pagina de gestao de cupons de desconto com CRUD, toggle de ativacao e restricao de produtos.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza a tabela de cupons (codigo, desconto, usos com barra de progresso, validade, status clicavel e acoes). Contem o modal de formulario com campos de codigo, descricao, tipo de desconto, valor, valor minimo do pedido, limite de usos, restricao de produtos, periodo de validade e toggle ativo. Sub-componentes: CategoryCheckboxTree, ProductSelector, CopyCodeButton, Toggle, StatusBadge, Modal. |
| `page.hooks.ts` | Carrega cupons, produtos e categorias da API. Gerencia abertura de modais, validacao (incluindo duplicata de codigo), envio do formulario, exclusao e toggle de ativo/inativo. Exporta funcoes utilitarias `computeStatus` e `formatDate`. |

## Fluxo de dados

1. `useCuponsPage()` chama em paralelo: `couponsService.listCoupons`, `catalogService.listProductOptions`, `categoriesService.listCategories` → monta a arvore de categorias com `buildCategoryTree`.
2. Ao salvar, o hook verifica duplicata de codigo localmente, resolve os `productIds` conforme o modo de restricao (todos, por categorias expandidas, ou por produtos especificos) e chama `couponsService.createCoupon` ou `updateCoupon`.
3. O status e calculado dinamicamente com base em `active`, datas de vigencia e uso maximo.

## Estados gerenciados

| Estado | Tipo | Descricao |
|--------|------|-----------|
| `coupons` | `Coupon[]` | Lista de cupons |
| `products` | `ProductOption[]` | Lista de produtos para selecao |
| `categoryTree` | `Category[]` | Arvore de categorias para filtro por categoria |
| `modalOpen` | `boolean` | Modal de criar/editar aberto |
| `editingCoupon` | `Coupon \| null` | Cupom sendo editado |
| `form` | `CouponFormData` | Dados do formulario |
| `formError` | `string \| null` | Erro de validacao |
| `isSaving` | `boolean` | Salvamento em andamento |
| `hasDateRange` | `boolean` | Toggle de periodo de validade |
| `hasMaxUses` | `boolean` | Toggle de limite de usos |
| `restrictionMode` | `'all' \| 'categories' \| 'products'` | Modo de restricao de produtos |
| `selectedCategoryIds` | `string[]` | Categorias selecionadas |
| `deletingCoupon` | `Coupon \| null` | Cupom selecionado para exclusao |
| `isDeleting` | `boolean` | Exclusao em andamento |

## Acoes do usuario

| Acao | Handler | O que faz |
|------|---------|-----------|
| Clicar "Novo cupom" | `openCreateModal` | Abre modal com formulario vazio |
| Clicar editar | `openEditModal` | Abre modal preenchido com dados do cupom |
| Salvar cupom | `handleSave` | Valida codigo e desconto, verifica duplicata, resolve productIds e chama create/update |
| Excluir cupom | `handleDelete` | Remove o cupom da API |
| Clicar no status | `toggleActive` | Inverte o campo `active` via API |
| Copiar codigo | `CopyCodeButton` | Copia o codigo para a area de transferencia com feedback visual |

## Modulos utilizados

- `@/modules/coupons/services/coupons.service` — CRUD de cupons
- `@/modules/catalog/services/catalog.service` — `listProductOptions` para o seletor de produtos
- `@/modules/categories/services/categories.service` — listar categorias
- `@/modules/categories/utils/categories` — `buildCategoryTree`, `flattenCategories`, `expandSelectedCategories`
- Mocks de coupons (quando `USE_MOCK_DATA = true`)

## Observacoes

- A flag `USE_MOCK_DATA` esta `false`.
- O codigo do cupom e convertido automaticamente para maiusculas.
- Cupons com `productIds` nao vazios afetam apenas os produtos selecionados.
- O status exibido pode ser: Ativo, Inativo, Agendado, Encerrado ou Esgotado (quando usos atingem o maximo).
- A barra de progresso de usos muda de cor quando o cupom esta esgotado.
- A verificacao de duplicata de codigo e feita localmente antes de chamar a API.
