# QA — Árvore de Categorias

**Commits relacionados:** `ebd8824`, `64ee0d3`
**Data:** 2026-06-09 a 2026-06-10

## Descrição

Categorias são auto-referenciais (parentId) formando uma árvore de qualquer profundidade. O admin oferece CRUD interativo com visualização em árvore. Exclusão de categoria exclui todos os descendentes via BFS (`collectDescendantIds`).

## Casos de Teste

### CT-01: Criar categoria raiz
1. Acessar `/admin/categorias`
2. Criar categoria sem parent
3. **Esperado:** Categoria raiz criada. Aparece no primeiro nível da árvore.

### CT-02: Criar subcategoria
1. Criar categoria com parentId de uma existente
2. **Esperado:** Aparece como filho na árvore.

### CT-03: Árvore com múltiplos níveis
1. Criar: Perfumes > Masculinos > Importados
2. **Esperado:** Árvore renderiza corretamente com 3 níveis.

### CT-04: Editar categoria
1. Alterar nome de uma categoria
2. **Esperado:** Nome atualizado na árvore e nos filtros do catálogo.

### CT-05: Excluir categoria com descendentes
1. Excluir categoria "Perfumes" que tem filhos
2. **Esperado:** Todos os descendentes excluídos (BFS via `collectDescendantIds`). Produtos dessas categorias perdem a associação.

### CT-06: Filtro de catálogo por categoria
1. No catálogo público, selecionar uma categoria
2. **Esperado:** `expandSelectedCategories` expande IDs selecionados para incluir descendentes. Produtos de subcategorias também aparecem.

### CT-07: Categoria de outra loja
1. Tentar acessar categoria de outra loja
2. **Esperado:** 404 (isolamento multi-tenant).

## Utilitários (utils/categories.ts)

| Função | Descrição |
|--------|-----------|
| `flattenCategories(tree)` | Árvore → lista plana |
| `buildCategoryTree(flat)` | Lista plana → árvore |
| `expandSelectedCategories(ids, all)` | Expande IDs para incluir descendentes |

## Critérios de Aceite

- [ ] CRUD de categorias funciona
- [ ] Árvore renderiza com N níveis
- [ ] Exclusão cascateia para descendentes
- [ ] Filtro do catálogo expande para subcategorias
- [ ] Isolamento por loja
