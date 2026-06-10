// Operações relacionadas aos cupons de desconto
import { apiClient } from './api-client'
import type { Coupon } from '@esqueleton/shared'

export const couponsService = {
  listCoupons: () => apiClient.get<Coupon[]>('/coupons'),

  createCoupon: (data: Omit<Coupon, 'id' | 'createdAt' | 'usedCount'>, token: string) =>
    apiClient.post<Coupon>('/coupons', data, token),

  updateCoupon: (id: string, data: Partial<Coupon>, token: string) =>
    apiClient.put<Coupon>(`/coupons/${id}`, data, token),

  deleteCoupon: (id: string, token: string) =>
    apiClient.delete(`/coupons/${id}`, token),
}
