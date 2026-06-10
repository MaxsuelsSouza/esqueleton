// Categorias de exemplo para desenvolvimento — substitua pelos dados da API quando estiver pronta
import type { Category } from '@esqueleton/shared'

export const MOCK_CATEGORIES: Category[] = [
  {
    id: 'perfumes',
    name: 'Perfumes',
    parentId: null,
    children: [
      {
        id: 'perf-femininos',
        name: 'Femininos',
        parentId: 'perfumes',
        children: [
          { id: 'perf-fem-florais', name: 'Florais', parentId: 'perf-femininos' },
          { id: 'perf-fem-orientais', name: 'Orientais', parentId: 'perf-femininos' },
          { id: 'perf-fem-frutados', name: 'Frutados', parentId: 'perf-femininos' },
        ],
      },
      {
        id: 'perf-masculinos',
        name: 'Masculinos',
        parentId: 'perfumes',
        children: [
          { id: 'perf-masc-amadeirados', name: 'Amadeirados', parentId: 'perf-masculinos' },
          { id: 'perf-masc-citricos', name: 'Cítricos', parentId: 'perf-masculinos' },
          { id: 'perf-masc-aquaticos', name: 'Aquáticos', parentId: 'perf-masculinos' },
        ],
      },
      { id: 'perf-unissex', name: 'Unissex', parentId: 'perfumes' },
    ],
  },
  {
    id: 'banho-corpo',
    name: 'Banho & Corpo',
    parentId: null,
    children: [
      { id: 'banho-hidratantes', name: 'Hidratantes', parentId: 'banho-corpo' },
      { id: 'banho-sabonetes', name: 'Sabonetes', parentId: 'banho-corpo' },
      { id: 'banho-oleos', name: 'Óleos', parentId: 'banho-corpo' },
    ],
  },
  { id: 'kits', name: 'Kits & Presentes', parentId: null },
]
