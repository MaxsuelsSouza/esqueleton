// Operações relacionadas às promoções do catálogo
import { apiClient } from './api-client'
import type { Promotion } from '@esqueleton/shared'

export const promotionsService = {
  listPromotions: () => apiClient.get<Promotion[]>('/promotions'),

  createPromotion: (data: Omit<Promotion, 'id' | 'createdAt'>, token: string) =>
    apiClient.post<Promotion>('/promotions', data, token),

  updatePromotion: (id: string, data: Partial<Promotion>, token: string) =>
    apiClient.put<Promotion>(`/promotions/${id}`, data, token),

  deletePromotion: (id: string, token: string) =>
    apiClient.delete(`/promotions/${id}`, token),
}
