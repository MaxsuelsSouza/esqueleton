// Funções utilitárias para trabalhar com a árvore de categorias
import type { Category } from '@esqueleton/shared'

// Converte uma lista plana de categorias (com parentId) em uma árvore aninhada
export function buildCategoryTree(flat: Category[]): Category[] {
  const map = new Map<string, Category>()
  const roots: Category[] = []

  flat.forEach((cat) => map.set(cat.id, { ...cat, children: [] }))

  flat.forEach((cat) => {
    if (cat.parentId === null) {
      roots.push(map.get(cat.id)!)
    } else {
      const parent = map.get(cat.parentId)
      if (parent) {
        parent.children = parent.children ?? []
        parent.children.push(map.get(cat.id)!)
      }
    }
  })

  return roots
}

// Achata uma árvore de categorias em uma lista plana (sem o campo children)
export function flattenCategories(categories: Category[]): Category[] {
  const result: Category[] = []
  function traverse(cats: Category[]) {
    for (const cat of cats) {
      result.push({ id: cat.id, name: cat.name, parentId: cat.parentId })
      if (cat.children?.length) traverse(cat.children)
    }
  }
  traverse(categories)
  return result
}

// Retorna os IDs de uma categoria e de todos os seus descendentes
export function getDescendantIds(categoryId: string, flat: Category[]): string[] {
  const result = [categoryId]
  flat
    .filter((c) => c.parentId === categoryId)
    .forEach((c) => result.push(...getDescendantIds(c.id, flat)))
  return result
}

// Dado um conjunto de IDs selecionados, expande para incluir todos os descendentes
// Usado para filtrar produtos: selecionar "Femininos" inclui "Florais", "Orientais", etc.
export function expandSelectedCategories(
  selectedIds: string[],
  allCategories: Category[],
): Set<string> {
  const flat = flattenCategories(allCategories)
  const result = new Set<string>()
  for (const id of selectedIds) {
    getDescendantIds(id, flat).forEach((d) => result.add(d))
  }
  return result
}
