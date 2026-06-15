// Serviço de notificações — lista, marca como lida e verifica expirações
import type { Notification } from '@esqueleton/shared'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function authHeader(token: string, hasBody = false) {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (hasBody) headers['Content-Type'] = 'application/json'
  return headers
}

export const notificationsService = {
  // Retorna todas as notificações e o total não lido
  async list(token: string): Promise<{ notifications: Notification[]; unreadCount: number }> {
    const res = await fetch(`${API_URL}/api/notifications`, { headers: authHeader(token) })
    if (!res.ok) throw new Error('Não foi possível carregar as notificações.')
    return res.json()
  },

  // Dispara a verificação de promoções, cupons e destaques expirados
  async checkExpiry(token: string): Promise<{ created: number }> {
    const res = await fetch(`${API_URL}/api/notifications/check-expiry`, {
      method: 'POST',
      headers: authHeader(token),
    })
    if (!res.ok) throw new Error('Não foi possível verificar expirações.')
    return res.json()
  },

  // Marca uma notificação como lida
  async markRead(id: string, token: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: authHeader(token),
    })
    if (!res.ok) throw new Error('Não foi possível marcar como lida.')
  },

  // Marca todas as notificações como lidas
  async markAllRead(token: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: authHeader(token),
    })
    if (!res.ok) throw new Error('Não foi possível marcar todas como lidas.')
  },

  // Remove uma notificação
  async delete(id: string, token: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/notifications/${id}`, {
      method: 'DELETE',
      headers: authHeader(token),
    })
    if (!res.ok) throw new Error('Não foi possível remover a notificação.')
  },
}
