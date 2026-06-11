'use client'

// Sino de notificações — exibe o total não lido e navega para a página de notificações
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { notificationsService } from '@/services/notifications.service'

export function NotificationBell() {
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem('admin_token') ?? ''
    if (!token) return

    // Carrega o total não lido imediatamente ao montar
    function fetchCount() {
      notificationsService.list(token).then((data) => setUnreadCount(data.unreadCount)).catch(() => {})
    }

    fetchCount()

    // Atualiza o contador a cada 60 segundos para refletir novos pedidos ou eventos
    const interval = setInterval(fetchCount, 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <button
      onClick={() => router.push('/admin/notificacoes')}
      aria-label={unreadCount > 0 ? `${unreadCount} notificações não lidas` : 'Notificações'}
      className="relative flex items-center justify-center rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
    >
      <Bell size={17} />

      {/* Badge com o contador — só aparece quando há notificações não lidas */}
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold leading-none text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}
