'use client'

// Hook que concentra toda a lógica de estado e callbacks da página de lojas (super-admin)
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/modules/auth/hooks/useAdminAuth'
import { superService } from '@/modules/super/services/super.service'
import type { SuperStore, SuperPlan } from '@esqueleton/shared'

export function useSuperLojasPage() {
  const { token, isSuperAdmin, isChecking } = useAdminAuth()
  const router = useRouter()

  const [stores, setStores] = useState<SuperStore[]>([])
  const [plans, setPlans] = useState<SuperPlan[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // ID da loja com ação em andamento — desabilita os botões dela
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadStores = useCallback(async () => {
    if (!token) return
    try {
      const result = await superService.listStores(token, {
        page,
        search: search || undefined,
        status: statusFilter || undefined,
      })
      setStores(result.data)
      setTotal(result.total)
      setPerPage(result.perPage)
    } catch {
      setError('Não foi possível carregar as lojas.')
    } finally {
      setLoading(false)
    }
  }, [token, page, search, statusFilter])

  useEffect(() => {
    if (!isChecking && !isSuperAdmin) {
      router.replace('/admin/dashboard')
      return
    }
    if (token) loadStores()
  }, [token, isChecking, isSuperAdmin, router, loadStores])

  // Carrega os planos uma vez — usados no seletor de troca de plano
  useEffect(() => {
    if (!token || !isSuperAdmin) return
    superService.listPlans(token).then(setPlans).catch(() => {})
  }, [token, isSuperAdmin])

  async function handleToggleStatus(store: SuperStore) {
    if (!token) return
    const novoStatus = store.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    const verbo = novoStatus === 'SUSPENDED' ? 'suspender' : 'reativar'
    if (!confirm(`Tem certeza que deseja ${verbo} a loja "${store.name}"?`)) return

    setBusyId(store.id)
    try {
      await superService.updateStore(store.id, { status: novoStatus }, token)
      await loadStores()
    } catch (err: unknown) {
      alert((err as { message?: string })?.message || 'Erro ao atualizar a loja.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleChangePlan(store: SuperStore, planId: string) {
    if (!token || !planId || planId === store.plan?.id) return
    const plan = plans.find((p) => p.id === planId)
    if (!confirm(`Mover a loja "${store.name}" para o plano "${plan?.name}"? A cobrança atual será cancelada.`)) return

    setBusyId(store.id)
    try {
      await superService.updateStore(store.id, { planId }, token)
      await loadStores()
    } catch (err: unknown) {
      alert((err as { message?: string })?.message || 'Erro ao trocar o plano.')
    } finally {
      setBusyId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return {
    stores,
    plans,
    total,
    page,
    setPage,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    loading,
    error,
    busyId,
    isChecking,
    totalPages,
    handleToggleStatus,
    handleChangePlan,
  }
}
