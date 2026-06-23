'use client'

// Página de gestão de pedidos — lista pedidos com filtro por status e ações rápidas
import { ShoppingBag, MessageCircle, Check, XCircle, Package } from 'lucide-react'
import type { Order, OrderItem } from '@esqueleton/shared'
import { usePedidosPage, getStatusConfig, formatDateTime, formatCurrency } from './page.hooks'
import type { StatusTab } from './page.hooks'

export default function AdminPedidosPage() {
  const {
    orders,
    activeTab,
    isLoading,
    error,
    updatingOrderNumber,
    pendingCount,
    statusTabs,
    handleTabChange,
    handleStatusChange,
  } = usePedidosPage()

  return (
    <div className="flex flex-col gap-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag size={20} className="text-gray-400" />
          <h1 className="text-lg font-semibold text-gray-900">Pedidos</h1>
          {pendingCount > 0 && (
            <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Abas de filtro por status */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Estado de carregamento */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        </div>
      )}

      {/* Lista vazia */}
      {!isLoading && orders.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Package size={40} className="text-gray-300" />
          <p className="text-sm text-gray-500">
            {activeTab === 'ALL'
              ? 'Nenhum pedido recebido ainda.'
              : 'Nenhum pedido com este status.'}
          </p>
        </div>
      )}

      {/* Lista de pedidos */}
      {!isLoading && orders.length > 0 && (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isUpdating={updatingOrderNumber === order.orderNumber}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Card individual de pedido — exibe detalhes e ações
function OrderCard({
  order,
  isUpdating,
  onStatusChange,
}: {
  order: Order
  isUpdating: boolean
  onStatusChange: (orderNumber: string, status: 'SOLD' | 'NOT_SOLD') => void
}) {
  const statusConfig = getStatusConfig(order.status as 'PENDING' | 'SOLD' | 'NOT_SOLD')
  const items = order.items as OrderItem[]
  const whatsappUrl = order.customerPhone
    ? `https://wa.me/${order.customerPhone.replace(/\D/g, '')}`
    : null

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">

      {/* Cabeçalho do card — número, data e status */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-900">#{order.orderNumber}</span>
          <span className="text-xs text-gray-400">{formatDateTime(order.createdAt)}</span>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>

      {/* Info do cliente */}
      {(order.customerName || order.customerPhone) && (
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
          {order.customerName && <span>{order.customerName}</span>}
          {order.customerPhone && <span>{order.customerPhone}</span>}
        </div>
      )}

      {/* Itens do pedido */}
      <div className="mb-3 space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-gray-700">
              {item.quantity}x {item.productName}
              {item.promotionName && (
                <span className="ml-1.5 text-xs text-purple-600">({item.promotionName})</span>
              )}
            </span>
            <span className="text-gray-500">{formatCurrency(item.lineTotal)}</span>
          </div>
        ))}
      </div>

      {/* Totais */}
      <div className="mb-4 border-t border-gray-100 pt-3">
        {order.discount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Desconto{order.couponCode && ` (${order.couponCode})`}
            </span>
            <span className="text-green-600">-{formatCurrency(order.discount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className="text-gray-900">Total</span>
          <span className="text-gray-900">{formatCurrency(order.total)}</span>
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        {order.status === 'PENDING' && (
          <>
            <button
              onClick={() => onStatusChange(order.orderNumber, 'SOLD')}
              disabled={isUpdating}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              <Check size={14} />
              Confirmar venda
            </button>
            <button
              onClick={() => onStatusChange(order.orderNumber, 'NOT_SOLD')}
              disabled={isUpdating}
              className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              <XCircle size={14} />
              Não vendido
            </button>
          </>
        )}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            <MessageCircle size={14} />
            Abrir WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}
