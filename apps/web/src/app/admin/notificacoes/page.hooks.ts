'use client'

// Hook que gerencia todo o estado e callbacks da página de notificações
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageCircle, BadgePercent, Ticket, Sparkles,
  Gauge, CreditCard, AlertTriangle, Rocket,
} from 'lucide-react'
import { notificationsService } from '@/modules/notifications/services/notifications.service'
import type { Notification, NotificationType } from '@esqueleton/shared'

type FilterTab = 'todas' | 'nao_lidas' | 'pedidos' | 'expiradas'

// Retorna o caminho de redirecionamento para cada tipo de notificação
function getRedirectPath(notification: Notification): string {
  switch (notification.type) {
    case 'NEW_ORDER':
      // Vai ao dashboard com o número do pedido pré-preenchido na busca
      return `/admin/dashboard?pedido=${notification.entityId ?? ''}`
    case 'PLAN_LIMIT_APPROACHING':
      return '/admin/plano'
    case 'SUBSCRIPTION_REQUIRED':
    case 'SUBSCRIPTION_CANCELLED':
    case 'SUBSCRIPTION_PAYMENT_FAILED':
      return '/admin/assinatura'
    case 'PROMOTION_ENDED':
      return '/admin/promocoes'
    case 'COUPON_ENDED':
      return '/admin/cupons'
    case 'FEATURED_ENDED':
      return '/admin/destaques'
    default:
      return '/admin/dashboard'
  }
}

// Configuração visual de cada tipo de notificação
export const TYPE_CONFIG: Record<NotificationType, {
  label: string
  icon: React.ElementType
  borderColor: string
  iconColor: string
  bgColor: string
}> = {
  NEW_ORDER:       { label: 'Pedido',    icon: MessageCircle, borderColor: 'border-blue-400',   iconColor: 'text-blue-500',   bgColor: 'bg-blue-50'   },
  PROMOTION_ENDED: { label: 'Promoção',  icon: BadgePercent,  borderColor: 'border-gray-300',   iconColor: 'text-gray-400',   bgColor: 'bg-gray-50'   },
  COUPON_ENDED:    { label: 'Cupom',     icon: Ticket,        borderColor: 'border-gray-300',   iconColor: 'text-gray-400',   bgColor: 'bg-gray-50'   },
  FEATURED_ENDED:  { label: 'Destaque',  icon: Sparkles,      borderColor: 'border-gray-300',   iconColor: 'text-gray-400',   bgColor: 'bg-gray-50'   },
  PLAN_LIMIT_APPROACHING:      { label: 'Plano',      icon: Gauge,         borderColor: 'border-orange-400', iconColor: 'text-orange-500', bgColor: 'bg-orange-50' },
  SUBSCRIPTION_REQUIRED:       { label: 'Ativação',   icon: Rocket,        borderColor: 'border-orange-400', iconColor: 'text-orange-500', bgColor: 'bg-orange-50' },
  SUBSCRIPTION_CANCELLED:      { label: 'Assinatura', icon: CreditCard,    borderColor: 'border-red-500',    iconColor: 'text-red-500',    bgColor: 'bg-red-50'    },
  SUBSCRIPTION_PAYMENT_FAILED: { label: 'Pagamento',  icon: AlertTriangle, borderColor: 'border-red-500',    iconColor: 'text-red-500',    bgColor: 'bg-red-50'    },
}

// Retorna quanto tempo atrás a notificação foi criada, em texto legível
export function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'agora mesmo'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days} dia${days > 1 ? 's' : ''}`
}

export type { FilterTab }

export function useNotificacoesPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('todas')

  const loadNotifications = useCallback(async () => {
    setIsLoading(true)
    const token = localStorage.getItem('admin_token') ?? ''
    try {
      // Verifica expirações de promoções, cupons e destaques antes de carregar a lista
      await notificationsService.checkExpiry(token).catch(() => {})
      const data = await notificationsService.list(token)
      setNotifications(data.notifications)
    } catch {
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  async function handleMarkRead(id: string) {
    const token = localStorage.getItem('admin_token') ?? ''
    try {
      await notificationsService.markRead(id, token)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'READ' } : n)),
      )
      // Avisa o sino de notificações para atualizar o badge
      window.dispatchEvent(new Event('notifications-read'))
    } catch {
      // Recarrega a lista para garantir o estado real do servidor
      loadNotifications()
    }
  }

  async function handleMarkAllRead() {
    const token = localStorage.getItem('admin_token') ?? ''
    try {
      await notificationsService.markAllRead(token)
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' })))
      // Avisa o sino de notificações para zerar o badge
      window.dispatchEvent(new Event('notifications-read'))
    } catch {
      // Recarrega a lista para garantir o estado real do servidor
      loadNotifications()
    }
  }

  async function handleDelete(id: string) {
    const token = localStorage.getItem('admin_token') ?? ''
    await notificationsService.delete(id, token).catch(() => {})
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  // Filtra as notificações conforme a aba ativa
  const filtered = notifications.filter((n) => {
    if (activeTab === 'nao_lidas') return n.status === 'PENDING'
    if (activeTab === 'pedidos')   return n.type === 'NEW_ORDER'
    if (activeTab === 'expiradas') return ['PROMOTION_ENDED', 'COUPON_ENDED', 'FEATURED_ENDED'].includes(n.type)
    return true
  })

  const unreadCount = notifications.filter((n) => n.status === 'PENDING').length

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'todas',     label: 'Todas',      count: notifications.length },
    { key: 'nao_lidas', label: 'Não lidas',  count: unreadCount },
    { key: 'pedidos',   label: 'Pedidos',    count: notifications.filter((n) => n.type === 'NEW_ORDER').length },
    { key: 'expiradas', label: 'Expiradas',  count: notifications.filter((n) => ['PROMOTION_ENDED', 'COUPON_ENDED', 'FEATURED_ENDED'].includes(n.type)).length },
  ]

  const handleNavigate = useCallback((n: Notification) => {
    // Marca como lida automaticamente ao navegar
    if (n.status === 'PENDING') handleMarkRead(n.id)
    router.push(getRedirectPath(n))
  }, [router])

  return {
    notifications,
    isLoading,
    activeTab,
    setActiveTab,
    filtered,
    unreadCount,
    tabs,
    handleMarkRead,
    handleMarkAllRead,
    handleDelete,
    handleNavigate,
  }
}
