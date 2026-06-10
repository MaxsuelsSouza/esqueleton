// Seções em destaque de exemplo para desenvolvimento
import type { Featured } from '@esqueleton/shared'

export const MOCK_FEATURED: Featured[] = [
  {
    id: 'featured-1',
    title: 'Em destaque',
    tag: 'Destaque',
    productIds: ['1', '2', '3', '4'],
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'featured-2',
    title: 'Ofertas da semana',
    tag: 'Oferta',
    productIds: ['7', '8', '9', '10'],
    active: false,
    createdAt: new Date().toISOString(),
  },
]
