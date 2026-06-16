'use client'

// Botão no cabeçalho que exibe o nome do cliente identificado e permite sair
// Desktop: pill com ícone + nome + botão de sair
// Mobile: só o ícone de sair (espaço reduzido no header)
import { LogOut, User } from 'lucide-react'
import { useCustomer } from '@/modules/customers/contexts/customer-context'

export function CustomerButton() {
  const { customer, clearCustomer } = useCustomer()

  // Não exibe nada quando o cliente não está identificado
  if (!customer) return null

  return (
    <>
      {/* Desktop — pill completo com nome */}
      <div className="hidden sm:flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5">
        <User size={14} className="shrink-0 text-gray-500" />
        <span className="max-w-[120px] truncate text-sm font-medium text-gray-700">
          {customer.name}
        </span>
        <button
          onClick={clearCustomer}
          aria-label="Sair"
          title="Sair"
          className="ml-1 text-gray-400 transition-colors hover:text-red-500"
        >
          <LogOut size={14} />
        </button>
      </div>

      {/* Mobile — só o ícone de sair */}
      <button
        onClick={clearCustomer}
        aria-label="Sair"
        title={`Sair (${customer.name})`}
        className="sm:hidden text-gray-500 hover:text-red-500 transition-colors"
      >
        <LogOut size={20} />
      </button>
    </>
  )
}
