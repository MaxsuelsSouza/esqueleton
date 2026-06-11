// Serviço de pedidos — salva o pedido quando o cliente vai para o WhatsApp
import { apiClient } from './api-client'
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
  // Cria um pedido — fire and forget, nunca bloqueia o envio pelo WhatsApp
  async create(input: CreateOrderInput): Promise<void> {
    try {
      await apiClient.post('/orders', input)
    } catch {
      // Falha silenciosa — o pedido nunca deve bloquear o fluxo do cliente
    }
  },

  // Lista todos os pedidos — requer token de admin
  async listAll(token: string): Promise<Order[]> {
    const res = await fetch(`${API_URL}/api/orders`, {
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
