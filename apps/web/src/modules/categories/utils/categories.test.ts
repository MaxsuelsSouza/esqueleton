// Testes das funções da árvore de categorias
import { describe, it, expect } from 'vitest'
import type { Category } from '@esqueleton/shared'
import {
  buildCategoryTree,
  flattenCategories,
  getDescendantIds,
  expandSelectedCategories,
} from './categories'

// Estrutura de teste:
// Perfumes
// ├── Femininos
// │   └── Florais
// └── Masculinos
// Banho (raiz separada)
const lista: Category[] = [
  { id: 'perfumes', name: 'Perfumes', parentId: null },
  { id: 'femininos', name: 'Femininos', parentId: 'perfumes' },
  { id: 'florais', name: 'Florais', parentId: 'femininos' },
  { id: 'masculinos', name: 'Masculinos', parentId: 'perfumes' },
  { id: 'banho', name: 'Banho', parentId: null },
]

describe('buildCategoryTree', () => {
  it('monta a árvore a partir da lista plana', () => {
    const tree = buildCategoryTree(lista)

    expect(tree).toHaveLength(2) // Perfumes e Banho são raízes
    const perfumes = tree.find((c) => c.id === 'perfumes')!
    expect(perfumes.children?.map((c) => c.id)).toEqual(['femininos', 'masculinos'])
    const femininos = perfumes.children!.find((c) => c.id === 'femininos')!
    expect(femininos.children?.map((c) => c.id)).toEqual(['florais'])
  })

  it('ignora categoria com pai inexistente em vez de quebrar', () => {
    const tree = buildCategoryTree([
      { id: 'orfa', name: 'Órfã', parentId: 'nao-existe' },
    ])
    expect(tree).toHaveLength(0)
  })
})

describe('flattenCategories', () => {
  it('achatar e remontar devolve as mesmas categorias', () => {
    const tree = buildCategoryTree(lista)
    const flat = flattenCategories(tree)

    expect(flat).toHaveLength(lista.length)
    expect(flat.map((c) => c.id).sort()).toEqual(lista.map((c) => c.id).sort())
  })
})

describe('getDescendantIds', () => {
  it('retorna a própria categoria e todos os descendentes', () => {
    const ids = getDescendantIds('perfumes', lista)
    expect(ids.sort()).toEqual(['femininos', 'florais', 'masculinos', 'perfumes'])
  })

  it('categoria sem filhos retorna apenas ela mesma', () => {
    expect(getDescendantIds('banho', lista)).toEqual(['banho'])
  })
})

describe('expandSelectedCategories', () => {
  it('selecionar uma categoria pai inclui todos os filhos no filtro', () => {
    const tree = buildCategoryTree(lista)
    const expanded = expandSelectedCategories(['femininos'], tree)

    expect(expanded.has('femininos')).toBe(true)
    expect(expanded.has('florais')).toBe(true)
    expect(expanded.has('masculinos')).toBe(false)
  })
})
