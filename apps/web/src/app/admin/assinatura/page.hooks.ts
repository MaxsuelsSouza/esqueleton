'use client'

// Hook que concentra toda a lógica de estado e callbacks da página de assinatura
import { useState, useEffect, useCallback } from 'react'
import { useAdminAuth } from '@/modules/auth/hooks/useAdminAuth'
import { billingService } from '@/modules/billing/services/billing.service'
import type { Plan, BillingCurrentResponse } from '@esqueleton/shared'

export function useAssinaturaPage() {
  const { token, isOwner, isChecking } = useAdminAuth()

  const [billing, setBilling] = useState<BillingCurrentResponse | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subscribingId, setSubscribingId] = useState<string | null>(null)
  const [pendingMessage, setPendingMessage] = useState(false)

  const loadData = useCallback(async () => {
    if (!token) return
    try {
      const [currentData, plansData] = await Promise.all([
        billingService.current(token),
        billingService.listPlans(),
      ])
      setBilling(currentData)
      // O onboarding oferece apenas planos pagos e autoatendimento — planos PRESENCIAL
      // são vendidos por um representante, não aparecem aqui
      setPlans(plansData.filter((plan) => plan.priceInCents > 0 && plan.salesModality !== 'PRESENCIAL'))
    } catch {
      setError('Não foi possível carregar as informações. Recarregue a página.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) loadData()
  }, [token, loadData])

  async function handleSubscribe(plan: Plan) {
    if (!token) return
    setError(null)
    setSubscribingId(plan.id)
    try {
      const result = await billingService.subscribe(plan.id, token)
      if (result.checkoutUrl) {
        // Vai para o checkout seguro do MercadoPago cadastrar o cartão
        window.location.href = result.checkoutUrl
        return
      }
      // Sem URL de checkout (ambiente sem MercadoPago): assinatura ficou pendente
      setPendingMessage(true)
      await loadData()
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Erro ao iniciar a assinatura. Tente novamente.')
    } finally {
      setSubscribingId(null)
    }
  }

  const subscription = billing?.subscription ?? null
  const trial = billing?.trial ?? null
  const hasActiveSubscription = subscription?.status === 'ACTIVE'
  const isPending = subscription?.status === 'PENDING'
  // Venda presencial aguardando a confirmação manual da taxa de implantação
  const isPendingSetup = subscription?.status === 'PENDING_SETUP'

  return {
    isChecking,
    isOwner,
    loading,
    error,
    billing,
    plans,
    subscribingId,
    pendingMessage,
    subscription,
    trial,
    hasActiveSubscription,
    isPending,
    isPendingSetup,
    handleSubscribe,
  }
}
