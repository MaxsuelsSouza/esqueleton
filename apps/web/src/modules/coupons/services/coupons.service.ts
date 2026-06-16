// Operações relacionadas aos cupons de desconto
import { apiClient } from '@/shared/services/api-client'
import type { Coupon } from '@esqueleton/shared'

export const couponsService = {
  // ── Site público — busca um cupom da loja visitada pelo código digitado ────
  // A API valida (ativo, prazo, limite de usos) e retorna apenas os campos
  // necessários para aplicar o desconto
  getPublicCouponByCode: (slug: string, code: string) =>
    apiClient.get<Coupon>(
      `/lojas/${encodeURIComponent(slug)}/coupons/codigo/${encodeURIComponent(code)}`,
    ),

  // ── Painel admin (requer login) ─────────────────────────────────────────────

  // Lista completa de cupons da loja do administrador
  listCoupons: (token: string) => apiClient.get<Coupon[]>('/coupons', token),

  createCoupon: (data: Omit<Coupon, 'id' | 'createdAt' | 'usedCount'>, token: string) =>
    apiClient.post<Coupon>('/coupons', data, token),

  updateCoupon: (id: string, data: Partial<Coupon>, token: string) =>
    apiClient.put<Coupon>(`/coupons/${id}`, data, token),

  deleteCoupon: (id: string, token: string) =>
    apiClient.delete(`/coupons/${id}`, token),
}
