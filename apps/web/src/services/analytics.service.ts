// Serviço de analytics — registra eventos de produto e busca métricas para o dashboard
import { apiClient } from './api-client'
import type { AnalyticsSummary, ProductEventType } from '@esqueleton/shared'

interface RecordEventInput {
  productId: string
  productName: string
  eventType: ProductEventType
  promotionId?: string
  promotionName?: string
  // Código do cupom — relevante apenas em WHATSAPP_SEND
  couponCode?: string
  // Seção em destaque de origem — relevante em FEATURED_CLICK e CART_ADD
  featuredId?: string
  featuredName?: string
}

export const analyticsService = {
  // Registra um evento de produto — fire and forget, nunca bloqueia o fluxo do usuário
  async recordEvent(event: RecordEventInput): Promise<void> {
    try {
      await apiClient.post('/analytics/events', event)
    } catch {
      // Falha silenciosa — analytics nunca deve interromper uma ação do usuário
    }
  },

  // Remove todos os eventos do funil — requer token de admin
  async clearEvents(token: string): Promise<void> {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    const res = await fetch(`${API_URL}/api/analytics/events`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Não foi possível limpar os registros.')
  },

  // Retorna o resumo de métricas para o dashboard — requer token de admin no header
  async getSummary(token: string): Promise<AnalyticsSummary> {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    const res = await fetch(`${API_URL}/api/analytics/summary`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    if (!res.ok) throw new Error('Não foi possível carregar as métricas.')
    return res.json()
  },
}
