'use client'

// Popup de pedidos pendentes — aparece quando um pedido está há mais de 3 horas sem confirmação
import { useState, useEffect } from 'react'
import { Clock, X, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// Chave usada no sessionStorage para não repetir o popup na mesma sessão
function popupKey(orderNumber: string) {
  return `popup_pending_${orderNumber}`
}

type PendingAlert = {
  orderNumber: string
  customerName?: string
  total: number
}

export function PendingOrdersPopup() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<PendingAlert[]>([])

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) return

    // Busca pedidos pendentes e filtra os que estão há mais de 3 horas sem confirmação
    fetch(`${API_URL}/api/orders?status=PENDING`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((orders: Array<{ orderNumber: string; customerName?: string; total: number; createdAt: string }>) => {
        const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000
        const newAlerts: PendingAlert[] = []

        for (const order of orders) {
          const createdAt = new Date(order.createdAt).getTime()
          if (createdAt > threeHoursAgo) continue // menos de 3h, ainda não alerta
          if (sessionStorage.getItem(popupKey(order.orderNumber))) continue // já mostrou nesta sessão

          sessionStorage.setItem(popupKey(order.orderNumber), '1')
          newAlerts.push({ orderNumber: order.orderNumber, customerName: order.customerName, total: order.total })
        }

        setAlerts(newAlerts)
      })
      .catch(() => {})
  }, [])

  function dismiss(orderNumber: string) {
    setAlerts((prev) => prev.filter((a) => a.orderNumber !== orderNumber))
  }

  if (alerts.length === 0) return null

  return (
    // Pilha de popups no canto inferior direito — aparecem um por um sem bloquear a tela
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {alerts.map((alert) => (
        <div
          key={alert.orderNumber}
          className="flex w-80 items-start gap-3 rounded-xl border border-orange-200 bg-white p-4 shadow-lg"
        >
          {/* Ícone de alerta */}
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100">
            <Clock size={16} className="text-orange-500" />
          </div>

          {/* Conteúdo */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">
              Pedido #{alert.orderNumber} aguardando
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {alert.customerName
                ? `${alert.customerName} · `
                : ''}
              Há mais de 3h sem confirmação
            </p>

            {/* Botão de ir confirmar */}
            <button
              onClick={() => {
                dismiss(alert.orderNumber)
                router.push('/admin/dashboard')
              }}
              className="mt-2 flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-800"
            >
              Ir confirmar <ArrowRight size={11} />
            </button>
          </div>

          {/* Fechar popup */}
          <button
            onClick={() => dismiss(alert.orderNumber)}
            aria-label="Fechar"
            className="shrink-0 text-gray-300 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
