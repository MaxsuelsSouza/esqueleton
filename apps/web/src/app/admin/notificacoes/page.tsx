'use client'

// Página de notificações — exibe alertas de pedidos, promoções, cupons e destaques
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell, MessageCircle, BadgePercent, Ticket, Sparkles,
  Check, Trash2, CheckCheck, ChevronRight, Copy, Phone,
  Gauge, CreditCard, AlertTriangle,
} from 'lucide-react'
import { notificationsService } from '@/services/notifications.service'
import type { Notification, NotificationType } from '@esqueleton/shared'

// Retorna o caminho de redirecionamento para cada tipo de notificação
function getRedirectPath(notification: Notification): string {
  switch (notification.type) {
    case 'NEW_ORDER':
      // Vai ao dashboard com o número do pedido pré-preenchido na busca
      return `/admin/dashboard?pedido=${notification.entityId ?? ''}`
    case 'PLAN_LIMIT_APPROACHING':
    case 'SUBSCRIPTION_CANCELLED':
    case 'SUBSCRIPTION_PAYMENT_FAILED':
      return '/admin/plano'
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
const TYPE_CONFIG: Record<NotificationType, {
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
  SUBSCRIPTION_CANCELLED:      { label: 'Assinatura', icon: CreditCard,    borderColor: 'border-red-500',    iconColor: 'text-red-500',    bgColor: 'bg-red-50'    },
  SUBSCRIPTION_PAYMENT_FAILED: { label: 'Pagamento',  icon: AlertTriangle, borderColor: 'border-red-500',    iconColor: 'text-red-500',    bgColor: 'bg-red-50'    },
}

type FilterTab = 'todas' | 'nao_lidas' | 'pedidos' | 'expiradas'

// Retorna quanto tempo atrás a notificação foi criada, em texto legível
function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'agora mesmo'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days} dia${days > 1 ? 's' : ''}`
}

export default function NotificacoesPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('todas')

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
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
  }

  async function handleMarkRead(id: string) {
    const token = localStorage.getItem('admin_token') ?? ''
    await notificationsService.markRead(id, token).catch(() => {})
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: 'READ' } : n)),
    )
  }

  async function handleMarkAllRead() {
    const token = localStorage.getItem('admin_token') ?? ''
    await notificationsService.markAllRead(token).catch(() => {})
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' })))
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

  return (
    <div className="flex flex-col gap-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Notificações</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <CheckCheck size={15} />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Abas de filtro */}
      <div className="rounded-2xl border border-gray-100 bg-white">
        <div className="flex overflow-x-auto border-b scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  activeTab === tab.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lista de notificações */}
        {isLoading ? (
          <div className="flex flex-col divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-4">
                <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-100" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-3.5 w-2/3 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Bell size={32} strokeWidth={1.5} className="text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Nenhuma notificação aqui</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {filtered.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
                onNavigate={(n) => {
                  // Marca como lida automaticamente ao navegar
                  if (n.status === 'PENDING') handleMarkRead(n.id)
                  router.push(getRedirectPath(n))
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// Exibe telefone e total de um pedido, com botão de copiar o número
function OrderMetadata({ metadata }: { metadata: string }) {
  const [copied, setCopied] = useState(false)

  let phone: string | null = null
  let total: number | null = null

  try {
    const parsed = JSON.parse(metadata) as { customerPhone?: string | null; total?: number | null }
    phone = parsed.customerPhone ?? null
    total = parsed.total ?? null
  } catch {
    return null
  }

  if (!phone && total === null) return null

  async function copyPhone() {
    if (!phone) return
    await navigator.clipboard.writeText(phone)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      {phone && (
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1">
          <Phone size={11} className="text-gray-400" />
          <span className="font-mono text-xs text-gray-700">{phone}</span>
          <button
            onClick={(e) => { e.stopPropagation(); copyPhone() }}
            aria-label="Copiar telefone"
            className="ml-0.5 text-gray-400 transition-colors hover:text-gray-700"
          >
            {copied
              ? <Check size={11} className="text-green-500" />
              : <Copy size={11} />
            }
          </button>
        </div>
      )}
      {total !== null && (
        <span className="text-xs font-semibold text-gray-600">
          {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      )}
    </div>
  )
}

// Cartão individual de notificação
function NotificationCard({
  notification,
  onMarkRead,
  onDelete,
  onNavigate,
}: {
  notification: Notification
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  onNavigate: (n: Notification) => void
}) {
  const cfg = TYPE_CONFIG[notification.type]
  const Icon = cfg.icon
  const isUnread = notification.status === 'PENDING'

  return (
    <li className={`group border-l-4 transition-colors ${cfg.borderColor} ${isUnread ? 'bg-white' : 'bg-gray-50/50'}`}>

      {/* Área clicável — navega para a página relacionada */}
      <button
        onClick={() => onNavigate(notification)}
        className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-gray-50"
      >
        {/* Ícone do tipo */}
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.bgColor}`}>
          <Icon size={15} className={cfg.iconColor} />
        </div>

        {/* Conteúdo */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {/* Ponto azul indica não lida */}
              <p className={`text-sm font-semibold ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>
                {isUnread && (
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-blue-500 align-middle" />
                )}
                {notification.title}
              </p>
              {notification.body && (
                <p className="mt-0.5 text-xs text-gray-500">{notification.body}</p>
              )}

              {/* Telefone do cliente — exibido apenas em notificações de novo pedido */}
              {notification.type === 'NEW_ORDER' && notification.metadata && (
                <OrderMetadata metadata={notification.metadata} />
              )}
            </div>

            {/* Tipo + tempo + seta de navegação */}
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                {cfg.label}
              </span>
              <span className="text-[11px] text-gray-400">{timeAgo(notification.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Seta indicando que é clicável */}
        <ChevronRight size={15} className="mt-1 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500" />
      </button>

      {/* Ações secundárias — ficam abaixo da área clicável */}
      <div className="flex gap-3 border-t border-gray-50 px-5 py-2">
        {isUnread && (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id) }}
            className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-700"
          >
            <Check size={12} />
            Marcar como lida
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(notification.id) }}
          className="flex items-center gap-1 text-xs font-medium text-gray-300 hover:text-red-500"
        >
          <Trash2 size={12} />
          Remover
        </button>
      </div>
    </li>
  )
}
