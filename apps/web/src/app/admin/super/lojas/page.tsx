'use client'

// Gestão de lojas da plataforma (super-admin) — busca, filtro por status,
// suspender/reativar e trocar o plano de uma loja
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { superService } from '@/services/super.service'
import type { SuperStore, SuperPlan } from '@esqueleton/shared'
import { Search, Building2, Ban, CheckCircle2, Layers } from 'lucide-react'

export default function SuperLojasPage() {
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

  if (isChecking || loading) {
    return <div className="flex min-h-[50vh] items-center justify-center" />
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Lojas da plataforma</h1>
        <p className="text-sm text-gray-400">{total} loja{total === 1 ? '' : 's'} cadastrada{total === 1 ? '' : 's'}.</p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{error}</p>
      )}

      {/* Busca e filtro por status */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por nome ou endereço da loja"
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-gray-300 focus:border-gray-900"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-900"
        >
          <option value="">Todas</option>
          <option value="ACTIVE">Ativas</option>
          <option value="SUSPENDED">Suspensas</option>
        </select>
      </div>

      {/* Tabela de lojas */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
        {stores.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
            <Building2 size={32} />
            <p className="text-sm">Nenhuma loja encontrada.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3">Loja</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Usuários</th>
                <th className="px-4 py-3">Produtos</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stores.map((store) => (
                <tr key={store.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{store.name}</p>
                    <a
                      href={`/loja/${store.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-gray-400 hover:text-gray-700 hover:underline"
                    >
                      /loja/{store.slug}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {store.status === 'ACTIVE' ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Ativa</span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">Suspensa</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {/* Seletor de plano — trocar aqui cancela a cobrança atual */}
                    <select
                      value={store.plan?.id ?? ''}
                      onChange={(e) => handleChangePlan(store, e.target.value)}
                      disabled={busyId === store.id}
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-gray-900 disabled:opacity-50"
                    >
                      {!store.plan && <option value="">Sem plano</option>}
                      {plans.filter((p) => p.active || p.id === store.plan?.id).map((plan) => (
                        <option key={plan.id} value={plan.id}>{plan.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{store.usersCount}</td>
                  <td className="px-4 py-3 text-gray-600">{store.productsCount}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleStatus(store)}
                      disabled={busyId === store.id}
                      title={store.status === 'ACTIVE' ? 'Suspender loja' : 'Reativar loja'}
                      className={`rounded-lg p-2 transition-colors disabled:opacity-50 ${
                        store.status === 'ACTIVE'
                          ? 'text-gray-300 hover:bg-red-50 hover:text-red-500'
                          : 'text-gray-300 hover:bg-green-50 hover:text-green-600'
                      }`}
                    >
                      {store.status === 'ACTIVE' ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-600 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-gray-500">Página {page} de {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-600 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}

      {/* Atalho para gestão de planos */}
      <p className="mt-6 flex items-center gap-1.5 text-xs text-gray-400">
        <Layers size={13} /> Os planos disponíveis são gerenciados em Plataforma → Planos.
      </p>
    </div>
  )
}
