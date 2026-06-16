# Categorias

Pagina de gestao de categorias em arvore hierarquica com CRUD e suporte a subcategorias de qualquer profundidade.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza a arvore interativa de categorias com botoes de expandir/recolher, adicionar subcategoria, editar e excluir (visiveis ao passar o mouse). Contem o modal de criar/editar (com campo de nome) e o modal de confirmacao de exclusao (com aviso de subcategorias que serao removidas). Sub-componentes: CategoryTreeView (recursivo), Modal. |
| `page.hooks.ts` | Carrega categorias como lista plana da API e monta a arvore com `buildCategoryTree`. Gerencia abertura de modais (criacao raiz ou subcategoria, edicao), validacao do nome, envio do formulario, exclusao em cascata e contagem de descendentes. |

## Fluxo de dados

1. `useCategoriasPage()` chama `categoriesService.listCategories` ao montar → recebe lista plana.
2. A arvore e montada com `useMemo` via `buildCategoryTree(flatCategories)`.
3. Ao criar, o hook envia `{ name, parentId }` para `categoriesService.createCategory`.
4. Ao editar, envia `{ name }` para `categoriesService.updateCategory`.
5. Ao excluir, chama `categoriesService.deleteCategory` — a API remove em cascata (BFS no servidor).

## Estados gerenciados

| Estado | Tipo | Descricao |
|--------|------|-----------|
| `flatCategories` | `Category[]` | Lista plana de categorias (estado interno) |
| `isLoading` | `boolean` | Indica carregamento |
| `isSaving` | `boolean` | Salvamento em andamento |
| `isDeleting` | `boolean` | Exclusao em andamento |
| `categoryTree` | `Category[]` | Arvore de categorias (calculada com useMemo) |
| `modalOpen` | `boolean` | Modal de criar/editar aberto |
| `editingCategory` | `Category \| null` | Categoria sendo editada |
| `parentForNew` | `Category \| null` | Categoria pai para nova subcategoria |
| `name` | `string` | Nome digitado no formulario |
| `nameError` | `string \| null` | Erro de validacao do nome |
| `deletingCategory` | `Category \| null` | Categoria selecionada para exclusao |

## Acoes do usuario

| Acao | Handler | O que faz |
|------|---------|-----------|
| Clicar "Nova categoria" | `openCreateModal(null)` | Abre modal para criar categoria raiz |
| Clicar "+ Sub" em uma categoria | `openCreateModal(parent)` | Abre modal para criar subcategoria |
| Clicar editar | `openEditModal` | Abre modal preenchido com nome da categoria |
| Salvar categoria | `handleSave` | Valida nome e chama create/update na API |
| Clicar excluir | `setDeletingCategory` | Abre modal de confirmacao com contagem de subcategorias |
| Confirmar exclusao | `handleDelete` | Remove categoria e subcategorias da API |
| Expandir/recolher | `toggleExpand` (CategoryTreeView) | Mostra ou oculta subcategorias |

## Modulos utilizados

- `@/modules/categories/services/categories.service` — CRUD de categorias
- `@/modules/categories/utils/categories` — `buildCategoryTree` para montar a arvore
- Mocks de categories (quando `USE_MOCK_DATA = true`)

## Observacoes

- A flag `USE_MOCK_DATA` esta `false`.
- Categorias sao auto-referenciais via `parentId` e suportam qualquer profundidade.
- O modal de exclusao avisa quantas subcategorias serao removidas em cascata (calculado por `countDescendants`).
- Todas as categorias vem expandidas por padrao ao carregar a pagina.
- O Enter no campo de nome dispara o salvamento.
