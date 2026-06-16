// Store em memória para destaques — compartilhado entre páginas durante a sessão
// O Next.js cacheia módulos no cliente, então mutações aqui são vistas por todas as rotas
import type { Featured } from '@esqueleton/shared'
import { MOCK_FEATURED } from './featured'

let current: Featured[] = [...MOCK_FEATURED]

export function getMockFeatured(): Featured[] {
  return current
}

export function setMockFeatured(sections: Featured[]): void {
  current = sections
}
