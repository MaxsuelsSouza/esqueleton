'use client'

// Contexto do cliente identificado — persiste nome e telefone no localStorage
// Limpo apenas quando o usuário clica em "Sair" no cabeçalho
import { createContext, useContext, useState, useEffect } from 'react'

export type CustomerInfo = {
  name: string
  phone: string
}

interface CustomerContextValue {
  customer: CustomerInfo | null
  // Salva os dados do cliente no contexto e no localStorage
  setCustomer: (info: CustomerInfo) => void
  // Remove os dados do cliente — chamado pelo botão "Sair" no cabeçalho
  clearCustomer: () => void
}

const STORAGE_KEY = 'customer_info'

const CustomerContext = createContext<CustomerContextValue>({
  customer: null,
  setCustomer: () => {},
  clearCustomer: () => {},
})

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomerState] = useState<CustomerInfo | null>(null)

  // Recupera os dados salvos no navegador ao iniciar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setCustomerState(JSON.parse(saved))
    } catch {}
  }, [])

  function setCustomer(info: CustomerInfo) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info))
    setCustomerState(info)
  }

  function clearCustomer() {
    localStorage.removeItem(STORAGE_KEY)
    setCustomerState(null)
  }

  return (
    <CustomerContext.Provider value={{ customer, setCustomer, clearCustomer }}>
      {children}
    </CustomerContext.Provider>
  )
}

export function useCustomer() {
  return useContext(CustomerContext)
}
