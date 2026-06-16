// Operações relacionadas às promoções do catálogo
import { apiClient } from '@/shared/services/api-client'
import type { Promotion } from '@esqueleton/shared'

export const promotionsService = {
  // ── Site público — retorna apenas promoções ativas da loja visitada ────────
  listPublicPromotions: (slug: string) =>
    apiClient.get<Promotion[]>(`/lojas/${encodeURIComponent(slug)}/promotions`),

  // ── Painel admin (requer login) ─────────────────────────────────────────────

  // Retorna todas as promoções da loja do administrador, inclusive desativadas e agendadas
  listPromotions: (token: string) => apiClient.get<Promotion[]>('/promotions', token),

  createPromotion: (data: Omit<Promotion, 'id' | 'createdAt'>, token: string) =>
    apiClient.post<Promotion>('/promotions', data, token),

  updatePromotion: (id: string, data: Partial<Promotion>, token: string) =>
    apiClient.put<Promotion>(`/promotions/${id}`, data, token),

  deletePromotion: (id: string, token: string) =>
    apiClient.delete(`/promotions/${id}`, token),

  // Atualiza a ordem de prioridade — envia os IDs na nova posição
  reorderPromotions: (ids: string[], token: string) =>
    apiClient.put<{ message: string }>('/promotions/reorder', { ids }, token),
}
