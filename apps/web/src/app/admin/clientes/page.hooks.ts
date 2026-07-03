'use client'

// Hook da página de clientes — lista, busca, correção, exportação e exclusão
// (ferramentas do art. 18 da LGPD para o lojista atender os clientes dele)
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAdminAuth } from '@/modules/auth/hooks/useAdminAuth'
import { customersService } from '@/modules/customers/services/customers.service'
import type { Customer } from '@esqueleton/shared'

export function useClientesPage() {
  const { token, isChecking } = useAdminAuth()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Busca por nome ou telefone — filtrada no navegador
  const [search, setSearch] = useState('')

  // Cliente em edição no modal (null = modal fechado)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Cliente aguardando confirmação de exclusão (null = modal fechado)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)
  // Opção de anonimizar os pedidos junto com a exclusão do cadastro
  const [anonimizarPedidos, setAnonimizarPedidos] = useState(true)
  const [deleting, setDeleting] = useState(false)

  // ID do cliente sendo exportado — desabilita o botão enquanto baixa
  const [exportingId, setExportingId] = useState<string | null>(null)

  const loadCustomers = useCallback(async () => {
    if (!token) return
    try {
      const data = await customersService.list(token)
      setCustomers(data)
    } catch {
      setError('Não foi possível carregar os clientes.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) loadCustomers()
  }, [token, loadCustomers])

  // Lista filtrada pela busca (nome ou telefone, sem diferenciar maiúsculas)
  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return customers
    const termDigits = term.replace(/\D/g, '')
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(term) ||
        (termDigits && customer.phone.includes(termDigits)),
    )
  }, [customers, search])

  function openEdit(customer: Customer) {
    setEditingCustomer(customer)
    setEditName(customer.name)
    setEditPhone(customer.phone)
    setEditError(null)
  }

  function closeEdit() {
    setEditingCustomer(null)
    setEditError(null)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !editingCustomer) return
    setEditError(null)
    setSaving(true)
    try {
      const updated = await customersService.update(
        editingCustomer.id,
        { name: editName.trim(), phone: editPhone.trim() },
        token,
      )
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      closeEdit()
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? ''
      setEditError(message || 'Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  function openDelete(customer: Customer) {
    setDeletingCustomer(customer)
    setAnonimizarPedidos(true)
  }

  function closeDelete() {
    setDeletingCustomer(null)
  }

  async function handleConfirmDelete() {
    if (!token || !deletingCustomer) return
    setDeleting(true)
    try {
      await customersService.remove(deletingCustomer.id, anonimizarPedidos, token)
      setCustomers((prev) => prev.filter((c) => c.id !== deletingCustomer.id))
      closeDelete()
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? ''
      alert(message || 'Erro ao excluir o cliente.')
    } finally {
      setDeleting(false)
    }
  }

  // Baixa o pacote de portabilidade do cliente como arquivo JSON
  async function handleExport(customer: Customer) {
    if (!token) return
    setExportingId(customer.id)
    try {
      const data = await customersService.exportData(customer.id, token)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `cliente-${customer.phone}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? ''
      alert(message || 'Erro ao exportar os dados do cliente.')
    } finally {
      setExportingId(null)
    }
  }

  return {
    customers: filteredCustomers,
    totalCustomers: customers.length,
    loading,
    error,
    isChecking,
    search,
    setSearch,
    editingCustomer,
    editName,
    setEditName,
    editPhone,
    setEditPhone,
    saving,
    editError,
    openEdit,
    closeEdit,
    handleSaveEdit,
    deletingCustomer,
    anonimizarPedidos,
    setAnonimizarPedidos,
    deleting,
    openDelete,
    closeDelete,
    handleConfirmDelete,
    exportingId,
    handleExport,
  }
}
