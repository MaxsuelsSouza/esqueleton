'use client'

// Contexto do cliente identificado — persiste nome e telefone no localStorage
// Limpo apenas quando o usuário clica em "Sair" no cabeçalho
import { createContext, useContext, useState, useEffect } from 'react'
import { useStoreSlug } from '@/hooks/useStoreSlug'

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

const CustomerContext = createContext<CustomerContextValue>({
  customer: null,
  setCustomer: () => {},
  clearCustomer: () => {},
})

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  // A chave do localStorage inclui o slug da loja — identificação separada por loja
  const slug = useStoreSlug()
  const storageKey = `cliente:${slug}`

  const [customer, setCustomerState] = useState<CustomerInfo | null>(null)

  // Recupera os dados salvos no navegador ao iniciar (e ao trocar de loja)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      setCustomerState(saved ? JSON.parse(saved) : null)
    } catch {}
  }, [storageKey])

  function setCustomer(info: CustomerInfo) {
    localStorage.setItem(storageKey, JSON.stringify(info))
    setCustomerState(info)
  }

  function clearCustomer() {
    localStorage.removeItem(storageKey)
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
