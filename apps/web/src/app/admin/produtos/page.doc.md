# Produtos

Pagina de gestao de produtos com listagem paginada, filtros, busca e CRUD completo via modal.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza a tabela de produtos (foto, marca, nome), barra de filtros (busca, ordenacao, categoria), modal de criar/editar produto (com campos de marca, nome, preco, foto principal, galeria, categorias, caracteristicas, variantes e descricao) e modal de confirmacao de exclusao. Contem sub-componentes: ImageUploader, MultiImageUploader, VariantsEditor, CharacteristicsEditor, CategoryCheckboxTree, Modal, FormField. |
| `page.hooks.ts` | Gerencia o estado da listagem (produtos, paginacao, filtros), carregamento de categorias em arvore, abertura/fechamento de modais, validacao e envio do formulario de produto, e exclusao. Aplica debounce de 300ms na busca. |

## Fluxo de dados

1. `useProdutosPage()` carrega categorias via `categoriesService.listCategories` uma unica vez e monta a arvore com `buildCategoryTree`.
2. Produtos sao carregados via `catalogService.listProducts` com paginacao no servidor (24 por pagina), busca, filtro de categoria e ordenacao. Recarrega automaticamente quando filtros ou pagina mudam (com debounce de 300ms).
3. Ao salvar, o hook valida nome e preco, filtra caracteristicas e variantes incompletas, e chama `catalogService.createProduct` ou `catalogService.updateProduct`.
4. Ao excluir, chama `catalogService.deleteProduct` e recarrega a listagem.

## Estados gerenciados

| Estado | Tipo | Descricao |
|--------|------|-----------|
| `products` | `Product[]` | Produtos da pagina atual |
| `categories` | `Category[]` | Arvore de categorias (para filtro e formulario) |
| `isLoading` | `boolean` | Indica carregamento da listagem |
| `error` | `string \| null` | Erro ao carregar produtos |
| `page` | `number` | Pagina atual da listagem |
| `total` | `number` | Total de produtos (todas as paginas) |
| `totalPages` | `number` | Numero total de paginas |
| `search` | `string` | Texto de busca |
| `filterCategory` | `string` | ID da categoria filtrada |
| `sortBy` | `string` | Ordenacao: newest, name, price-asc, price-desc |
| `modalOpen` | `boolean` | Modal de criar/editar aberto |
| `editingProduct` | `Product \| null` | Produto sendo editado (null = criando) |
| `formData` | `ProductFormData` | Dados do formulario (marca, nome, descricao, preco, imagem, galeria, categorias, caracteristicas, variantes) |
| `isSaving` | `boolean` | Indica salvamento em andamento |
| `formError` | `string \| null` | Erro de validacao do formulario |
| `deletingProduct` | `Product \| null` | Produto selecionado para exclusao |
| `isDeleting` | `boolean` | Indica exclusao em andamento |

## Acoes do usuario

| Acao | Handler | O que faz |
|------|---------|-----------|
| Clicar "Novo produto" | `openCreateModal` | Abre modal com formulario vazio |
| Clicar editar (icone lapis) | `openEditModal` | Abre modal preenchido com dados do produto |
| Salvar produto | `handleSave` | Valida, monta payload e chama create/update na API |
| Clicar excluir (icone lixeira) | `setDeletingProduct` | Abre modal de confirmacao |
| Confirmar exclusao | `handleDelete` | Chama delete na API e recarrega lista |
| Buscar / filtrar / ordenar | `setSearch`, `setFilterCategory`, `setSortBy` | Atualiza filtros e recarrega com debounce |
| Limpar filtros | `clearFilters` | Reseta busca, categoria, ordenacao e volta para pagina 1 |

## Modulos utilizados

- `@/modules/catalog/services/catalog.service` — CRUD de produtos e listagem paginada
- `@/modules/catalog/utils/image` — `compressImage` para comprimir fotos antes do upload
- `@/modules/categories/services/categories.service` — listar categorias
- `@/modules/categories/utils/categories` — `buildCategoryTree` para montar arvore
- Mocks de catalog e categories (quando `USE_MOCK_DATA = true`)

## Observacoes

- A flag `USE_MOCK_DATA` esta `false`.
- O upload de imagem suporta galeria e camera (no mobile), alem de drag-and-drop. Imagens sao comprimidas antes de enviar.
- Galeria de fotos suporta ate 10 imagens adicionais.
- Variantes sao pares de opcoes (ex: Cor=Branco) com preco e imagem opcionais.
- Caracteristicas sao pares nome/valor (ex: Tamanho=100ml).
- A paginacao e feita no servidor (PAGE_SIZE = 24), nao client-side.
