'use client'

// Hook que concentra toda a lógica de estado e callbacks da página de pedidos
import { useState, useEffect, useCallback } from 'react'
import { ordersService } from '@/modules/orders/services/orders.service'
import type { Order, OrderStatus } from '@esqueleton/shared'

// Abas de filtro disponíveis — "ALL" mostra todos os pedidos (sem filtro na API)
export type StatusTab = 'ALL' | OrderStatus

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: 'ALL',      label: 'Todos' },
  { value: 'PENDING',  label: 'Pendentes' },
  { value: 'SOLD',     label: 'Vendidos' },
  { value: 'NOT_SOLD', label: 'Não vendidos' },
]

// Cores e rótulos para cada status de pedido
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'Pendente',    color: 'text-yellow-800', bg: 'bg-yellow-100' },
  SOLD:     { label: 'Vendido',     color: 'text-green-800',  bg: 'bg-green-100' },
  NOT_SOLD: { label: 'Não vendido', color: 'text-red-800',    bg: 'bg-red-100' },
}

export function getStatusConfig(status: OrderStatus) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function usePedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Guarda o orderNumber do pedido sendo atualizado para mostrar loading individual
  const [updatingOrderNumber, setUpdatingOrderNumber] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

  const loadOrders = useCallback(async (tab: StatusTab) => {
    const token = localStorage.getItem('admin_token')
    if (!token) return

    setIsLoading(true)
    setError(null)
    try {
      const status = tab === 'ALL' ? undefined : tab
      const data = await ordersService.listAll(token, status)
      setOrders(data)

      // Se carregou todos, calcula a contagem de pendentes
      if (tab === 'ALL') {
        setPendingCount(data.filter((o) => o.status === 'PENDING').length)
      }
    } catch {
      setError('Erro ao carregar pedidos.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders(activeTab)
  }, [activeTab, loadOrders])

  function handleTabChange(tab: StatusTab) {
    setActiveTab(tab)
  }

  async function handleStatusChange(orderNumber: string, newStatus: Extract<OrderStatus, 'SOLD' | 'NOT_SOLD'>) {
    const token = localStorage.getItem('admin_token')
    if (!token) return

    setUpdatingOrderNumber(orderNumber)
    try {
      await ordersService.updateStatus(orderNumber, newStatus, token)
      // Recarrega a lista para refletir a mudança
      await loadOrders(activeTab)
    } catch {
      setError('Erro ao atualizar o status do pedido.')
    } finally {
      setUpdatingOrderNumber(null)
    }
  }

  return {
    orders,
    activeTab,
    isLoading,
    error,
    updatingOrderNumber,
    pendingCount,
    statusTabs: STATUS_TABS,
    handleTabChange,
    handleStatusChange,
  }
}
