// Serviço de pedidos — salva o pedido quando o cliente vai para o WhatsApp
import { apiClient } from '@/shared/services/api-client'
import type { Order, OrderItem, OrderStatus } from '@esqueleton/shared'

interface CreateOrderInput {
  orderNumber: string
  customerName?: string
  customerPhone?: string
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  couponCode?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const ordersService = {
  // Cria um pedido na loja visitada (slug) — nunca lança erro para não bloquear
  // o fluxo do WhatsApp, mas informa quem chamou se o registro falhou
  // (assim a tela pode avisar em vez de o pedido sumir silenciosamente)
  async create(slug: string, input: CreateOrderInput): Promise<{ ok: boolean; message?: string }> {
    try {
      await apiClient.post(`/lojas/${encodeURIComponent(slug)}/orders`, input)
      return { ok: true }
    } catch (error) {
      console.error('Falha ao registrar o pedido no servidor:', error)
      return { ok: false, message: (error as Error)?.message }
    }
  },

  // Lista todos os pedidos — requer token de admin. Filtra por status quando informado.
  async listAll(token: string, status?: OrderStatus): Promise<Order[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    const res = await fetch(`${API_URL}/api/orders${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Erro ao carregar pedidos.')
    return res.json()
  },

  // Busca um pedido pelo número — requer token de admin
  async searchByNumber(orderNumber: string, token: string): Promise<Order> {
    const res = await fetch(
      `${API_URL}/api/orders/search?orderNumber=${encodeURIComponent(orderNumber)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (res.status === 404) throw new Error('Pedido não encontrado.')
    if (!res.ok) throw new Error('Erro ao buscar o pedido.')
    return res.json()
  },

  // Atualiza o status do pedido — SOLD ou NOT_SOLD
  async updateStatus(orderNumber: string, status: Extract<OrderStatus, 'SOLD' | 'NOT_SOLD'>, token: string): Promise<Order> {
    const res = await fetch(
      `${API_URL}/api/orders/${encodeURIComponent(orderNumber)}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      },
    )
    if (!res.ok) throw new Error('Erro ao atualizar o pedido.')
    return res.json()
  },
}
