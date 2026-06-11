// Operações relacionadas aos cupons de desconto
import { apiClient } from './api-client'
import type { Coupon } from '@esqueleton/shared'

export const couponsService = {
  // Lista completa de cupons — apenas para o painel admin (requer token)
  listCoupons: (token: string) => apiClient.get<Coupon[]>('/coupons', token),

  // Busca um cupom pelo código digitado no checkout — a API valida e
  // retorna apenas os campos necessários para aplicar o desconto
  getCouponByCode: (code: string) =>
    apiClient.get<Coupon>(`/coupons/codigo/${encodeURIComponent(code)}`),

  createCoupon: (data: Omit<Coupon, 'id' | 'createdAt' | 'usedCount'>, token: string) =>
    apiClient.post<Coupon>('/coupons', data, token),

  updateCoupon: (id: string, data: Partial<Coupon>, token: string) =>
    apiClient.put<Coupon>(`/coupons/${id}`, data, token),

  deleteCoupon: (id: string, token: string) =>
    apiClient.delete(`/coupons/${id}`, token),
}
