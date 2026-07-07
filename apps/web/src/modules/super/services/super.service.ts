// Chamadas das rotas super-admin — gestão da plataforma (lojas, planos, usuários, métricas)
import { apiClient } from '@/shared/services/api-client'
import type {
  PaginatedResponse,
  SuperStore,
  SuperStoreDetail,
  SuperStoreCreateInput,
  SuperStoreCreateResult,
  SuperPaymentLinkResult,
  SuperUser,
  SuperPlan,
  PlanInput,
  PlatformMetrics,
} from '@esqueleton/shared'

export const superService = {
  // ── Lojas ──
  listStores: (token: string, params: { page?: number; search?: string; status?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return apiClient.get<PaginatedResponse<SuperStore>>(`/super/stores${suffix}`, token)
  },

  getStore: (id: string, token: string) =>
    apiClient.get<SuperStoreDetail>(`/super/stores/${id}`, token),

  // Altera o status (suspender/reativar) e/ou troca o plano da loja
  updateStore: (id: string, data: { status?: string; planId?: string }, token: string) =>
    apiClient.patch<{ message: string }>(`/super/stores/${id}`, data, token),

  // Venda presencial: cria loja + dono + plano e devolve o link de pagamento
  createStore: (data: SuperStoreCreateInput, token: string) =>
    apiClient.post<SuperStoreCreateResult>('/super/stores', data, token),

  // Gera (ou regenera) o link de pagamento de uma loja existente
  createPaymentLink: (storeId: string, planId: string, token: string) =>
    apiClient.post<SuperPaymentLinkResult>(`/super/stores/${storeId}/payment-link`, { planId }, token),

  // ── Planos ──
  listPlans: (token: string) =>
    apiClient.get<SuperPlan[]>('/super/plans', token),

  createPlan: (data: PlanInput, token: string) =>
    apiClient.post<SuperPlan>('/super/plans', data, token),

  updatePlan: (id: string, data: PlanInput, token: string) =>
    apiClient.put<SuperPlan>(`/super/plans/${id}`, data, token),

  // Desativa o plano (bloqueado se houver lojas usando)
  deletePlan: (id: string, token: string) =>
    apiClient.delete<void>(`/super/plans/${id}`, token),

  // ── Usuários ──
  listUsers: (token: string, params: { page?: number; search?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.search) query.set('search', params.search)
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return apiClient.get<PaginatedResponse<SuperUser>>(`/super/users${suffix}`, token)
  },

  // ── Métricas ──
  metrics: (token: string) =>
    apiClient.get<PlatformMetrics>('/super/metrics', token),
}
