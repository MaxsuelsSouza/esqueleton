// Funções para determinar qual seção em destaque exibir no catálogo público
import type { Featured } from '@esqueleton/shared'
import { getStoreDateTime } from '@/shared/utils/store-time'

// Verifica se uma seção em destaque está ativa agora — considera flag, período e janela de horário
export function isFeaturedActive(featured: Featured): boolean {
  if (!featured.active) return false

  // Data e hora no fuso da loja — o mesmo cálculo usado pela API
  const { date: today, time: currentTime } = getStoreDateTime()

  if (featured.startDate && today < featured.startDate) return false
  if (featured.endDate && today > featured.endDate) return false
  if (featured.startTime && currentTime < featured.startTime) return false
  if (featured.endTime && currentTime > featured.endTime) return false

  return true
}

// Retorna a primeira seção em destaque que está ativa no momento
export function getActiveFeatured(featuredSections: Featured[]): Featured | null {
  return featuredSections.find(isFeaturedActive) ?? null
}
