'use client'

// Hook que concentra toda a lógica de estado e callbacks da página de lojas (super-admin)
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/modules/auth/hooks/useAdminAuth'
import { superService } from '@/modules/super/services/super.service'
import type {
  SuperStore,
  SuperPlan,
  SuperStoreCreateInput,
  SuperStoreCreateResult,
  SuperPaymentLinkResult,
  SuperConfirmSetupFeeResult,
} from '@esqueleton/shared'

// Formulário vazio da criação de loja (venda presencial)
const FORMULARIO_VAZIO: SuperStoreCreateInput = {
  storeName: '',
  storeSlug: '',
  whatsapp: '',
  email: '',
  password: '',
  planId: '',
}

// Converte o nome da loja em uma sugestão de endereço (slug):
// "Perfumaria da Ana" → "perfumaria-da-ana"
function sugerirSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

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

  // ── Criação de loja (venda presencial) ──────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState<SuperStoreCreateInput>(FORMULARIO_VAZIO)
  // Enquanto o vendedor não mexer no endereço, ele acompanha o nome da loja
  const [slugEditadoManualmente, setSlugEditadoManualmente] = useState(false)
  const [createResult, setCreateResult] = useState<SuperStoreCreateResult | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  function openCreateModal() {
    setCreateForm(FORMULARIO_VAZIO)
    setSlugEditadoManualmente(false)
    setCreateResult(null)
    setCreateError(null)
    setShowCreateModal(true)
  }

  function closeCreateModal() {
    setShowCreateModal(false)
  }

  function updateCreateField(field: keyof SuperStoreCreateInput, value: string) {
    setCreateForm((atual) => {
      const novo = { ...atual, [field]: value }
      // O endereço acompanha o nome até o vendedor editá-lo manualmente
      if (field === 'storeName' && !slugEditadoManualmente) {
        novo.storeSlug = sugerirSlug(value)
      }
      if (field === 'storeSlug') {
        setSlugEditadoManualmente(true)
      }
      return novo
    })
  }

  async function handleCreateStore(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    if (!createForm.planId) {
      setCreateError('Escolha o plano da loja.')
      return
    }
    setCreateError(null)
    setIsCreating(true)
    try {
      const result = await superService.createStore(createForm, token)
      setCreateResult(result)
      await loadStores()
    } catch (err: unknown) {
      setCreateError((err as { message?: string })?.message || 'Erro ao criar a loja.')
    } finally {
      setIsCreating(false)
    }
  }

  // ── Link de pagamento para loja existente ───────────────────────
  const [linkStore, setLinkStore] = useState<SuperStore | null>(null)
  const [linkPlanId, setLinkPlanId] = useState('')
  const [linkResult, setLinkResult] = useState<SuperPaymentLinkResult | null>(null)
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  // Só planos pagos entram no link de pagamento — gratuito ativa direto pela troca de plano
  const paidPlans = plans.filter((plan) => plan.active && plan.priceInCents > 0)

  function openLinkModal(store: SuperStore) {
    setLinkStore(store)
    // Pré-seleciona o plano atual da loja quando for pago
    const planoAtual = paidPlans.find((plan) => plan.id === store.plan?.id)
    setLinkPlanId(planoAtual?.id ?? '')
    setLinkResult(null)
    setLinkError(null)
  }

  function closeLinkModal() {
    setLinkStore(null)
  }

  async function handleGeneratePaymentLink() {
    if (!token || !linkStore) return
    if (!linkPlanId) {
      setLinkError('Escolha o plano da cobrança.')
      return
    }
    setLinkError(null)
    setIsGeneratingLink(true)
    try {
      const result = await superService.createPaymentLink(linkStore.id, linkPlanId, token)
      setLinkResult(result)
      await loadStores()
    } catch (err: unknown) {
      setLinkError((err as { message?: string })?.message || 'Erro ao gerar o link de pagamento.')
    } finally {
      setIsGeneratingLink(false)
    }
  }

  // ── Confirmação da implantação (venda presencial) ───────────────
  const [setupFeeStore, setSetupFeeStore] = useState<SuperStore | null>(null)
  const [setupFeeResult, setSetupFeeResult] = useState<SuperConfirmSetupFeeResult | null>(null)
  const [isConfirmingSetupFee, setIsConfirmingSetupFee] = useState(false)
  const [setupFeeError, setSetupFeeError] = useState<string | null>(null)

  function openSetupFeeModal(store: SuperStore) {
    setSetupFeeStore(store)
    setSetupFeeResult(null)
    setSetupFeeError(null)
  }

  function closeSetupFeeModal() {
    setSetupFeeStore(null)
  }

  async function handleConfirmSetupFee() {
    if (!token || !setupFeeStore) return
    setSetupFeeError(null)
    setIsConfirmingSetupFee(true)
    try {
      const result = await superService.confirmSetupFee(setupFeeStore.id, token)
      setSetupFeeResult(result)
      await loadStores()
    } catch (err: unknown) {
      setSetupFeeError((err as { message?: string })?.message || 'Erro ao confirmar a implantação.')
    } finally {
      setIsConfirmingSetupFee(false)
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
    // Criação de loja (venda presencial)
    showCreateModal,
    openCreateModal,
    closeCreateModal,
    createForm,
    updateCreateField,
    handleCreateStore,
    createResult,
    isCreating,
    createError,
    // Link de pagamento
    paidPlans,
    linkStore,
    openLinkModal,
    closeLinkModal,
    linkPlanId,
    setLinkPlanId,
    handleGeneratePaymentLink,
    linkResult,
    isGeneratingLink,
    linkError,
    // Confirmação da implantação (venda presencial)
    setupFeeStore,
    openSetupFeeModal,
    closeSetupFeeModal,
    handleConfirmSetupFee,
    setupFeeResult,
    isConfirmingSetupFee,
    setupFeeError,
  }
}
