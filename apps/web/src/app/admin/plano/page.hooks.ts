'use client'

// Hook da página de plano — extrai toda a lógica de estado e callbacks
// para manter a página como uma view pura (Container/Presenter).
import { useState, useEffect, useCallback } from 'react'
import { useAdminAuth } from '@/modules/auth/hooks/useAdminAuth'
import { billingService } from '@/modules/billing/services/billing.service'
import type { Plan, BillingCurrentResponse, Invoice } from '@esqueleton/shared'

export function usePlanoPage() {
  const { token, isOwner, isChecking } = useAdminAuth()

  const [billing, setBilling] = useState<BillingCurrentResponse | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ID do plano sendo assinado — desabilita o botão enquanto aguarda
  const [subscribingId, setSubscribingId] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Histórico de faturas (Faturas) — paginado por cursor do Stripe
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(true)
  const [invoicesHasMore, setInvoicesHasMore] = useState(false)
  const [loadingMoreInvoices, setLoadingMoreInvoices] = useState(false)

  const loadData = useCallback(async () => {
    if (!token) return
    try {
      const [currentData, plansData] = await Promise.all([
        billingService.current(token),
        billingService.listPlans(),
      ])
      setBilling(currentData)
      setPlans(plansData)
    } catch {
      setError('Não foi possível carregar as informações do plano.')
    } finally {
      setLoading(false)
    }
  }, [token])

  const loadInvoices = useCallback(async () => {
    if (!token) return
    try {
      const { data, hasMore } = await billingService.listInvoices(token)
      setInvoices(data)
      setInvoicesHasMore(hasMore)
    } catch {
      // Faturas são secundárias — falha não bloqueia a página; a seção some
      setInvoices([])
      setInvoicesHasMore(false)
    } finally {
      setInvoicesLoading(false)
    }
  }, [token])

  // Carrega mais faturas a partir da última já exibida (cursor do Stripe)
  async function loadMoreInvoices() {
    if (!token || invoices.length === 0) return
    setLoadingMoreInvoices(true)
    try {
      const ultima = invoices[invoices.length - 1]
      const { data, hasMore } = await billingService.listInvoices(token, ultima.id)
      setInvoices((atuais) => [...atuais, ...data])
      setInvoicesHasMore(hasMore)
    } catch {
      setInvoicesHasMore(false)
    } finally {
      setLoadingMoreInvoices(false)
    }
  }

  useEffect(() => {
    if (token) {
      loadData()
      loadInvoices()
    }
  }, [token, loadData, loadInvoices])

  async function handleSubscribe(plan: Plan) {
    if (!token) return
    if (!confirm(`Trocar para o plano "${plan.name}"?`)) return

    setFeedback(null)
    setSubscribingId(plan.id)
    try {
      const result = await billingService.subscribe(plan.id, token)
      // Plano pago: redireciona para o checkout do Stripe
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
        return
      }
      setFeedback(`Plano alterado para "${plan.name}".`)
      await loadData()
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message
      setError(message || 'Erro ao trocar de plano. Tente novamente.')
    } finally {
      setSubscribingId(null)
    }
  }

  async function handleCancel() {
    if (!token) return
    if (!confirm('Cancelar a assinatura? Sem ela, sua loja fica fora do ar para os clientes.')) return

    setFeedback(null)
    setCancelling(true)
    try {
      const result = await billingService.cancel(token)
      setFeedback(result.message)
      await loadData()
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message
      setError(message || 'Erro ao cancelar a assinatura. Tente novamente.')
    } finally {
      setCancelling(false)
    }
  }

  const subscription = billing?.subscription ?? null
  const usage = billing?.usage ?? null
  const currentPlan = subscription?.plan ?? null
  const isPaidPlan = (currentPlan?.priceInCents ?? 0) > 0

  return {
    isChecking,
    isOwner,
    loading,
    error,
    feedback,
    billing,
    plans,
    subscribingId,
    cancelling,
    subscription,
    usage,
    currentPlan,
    isPaidPlan,
    handleSubscribe,
    handleCancel,
    // Faturas
    invoices,
    invoicesLoading,
    invoicesHasMore,
    loadingMoreInvoices,
    loadMoreInvoices,
  }
}
