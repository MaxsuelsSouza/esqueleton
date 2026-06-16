'use client'

// Hook da página de plano — extrai toda a lógica de estado e callbacks
// para manter a página como uma view pura (Container/Presenter).
import { useState, useEffect, useCallback } from 'react'
import { useAdminAuth } from '@/modules/auth/hooks/useAdminAuth'
import { billingService } from '@/modules/billing/services/billing.service'
import type { Plan, BillingCurrentResponse } from '@esqueleton/shared'

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

  useEffect(() => {
    if (token) loadData()
  }, [token, loadData])

  async function handleSubscribe(plan: Plan) {
    if (!token) return
    if (!confirm(`Trocar para o plano "${plan.name}"?`)) return

    setFeedback(null)
    setSubscribingId(plan.id)
    try {
      const result = await billingService.subscribe(plan.id, token)
      // Plano pago: redireciona para o checkout do MercadoPago
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
  }
}
