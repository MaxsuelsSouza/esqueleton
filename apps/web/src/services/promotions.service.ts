// Operações relacionadas às promoções do catálogo
import { apiClient } from './api-client'
import type { Promotion } from '@esqueleton/shared'

export const promotionsService = {
  // Sem token retorna apenas promoções ativas (catálogo público);
  // com token de admin retorna todas, inclusive desativadas e agendadas
  listPromotions: (token?: string) => apiClient.get<Promotion[]>('/promotions', token),

  createPromotion: (data: Omit<Promotion, 'id' | 'createdAt'>, token: string) =>
    apiClient.post<Promotion>('/promotions', data, token),

  updatePromotion: (id: string, data: Partial<Promotion>, token: string) =>
    apiClient.put<Promotion>(`/promotions/${id}`, data, token),

  deletePromotion: (id: string, token: string) =>
    apiClient.delete(`/promotions/${id}`, token),
}
