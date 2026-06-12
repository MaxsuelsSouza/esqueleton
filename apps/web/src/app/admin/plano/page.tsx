'use client'

// Página do plano — mostra a assinatura atual, o uso dos limites e os planos
// disponíveis. Trocar de plano e cancelar são ações exclusivas do OWNER.
import { useState, useEffect, useCallback } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { billingService } from '@/services/billing.service'
import type { Plan, BillingCurrentResponse } from '@esqueleton/shared'
import { Check, CreditCard, Package, Users, ShoppingBag } from 'lucide-react'

// Converte centavos em texto de preço (ex: 4990 → "R$ 49,90")
function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Texto do limite — null/ausente significa ilimitado
function limitText(value: number | null | undefined): string {
  return value == null ? 'Ilimitado' : String(value)
}

export default function PlanoPage() {
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

  if (isChecking || loading) {
    return <div className="flex min-h-[50vh] items-center justify-center" />
  }

  const subscription = billing?.subscription ?? null
  const usage = billing?.usage ?? null
  const currentPlan = subscription?.plan ?? null
  const isPaidPlan = (currentPlan?.priceInCents ?? 0) > 0

  return (
    <div className="mx-auto max-w-3xl">

      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Plano</h1>
        <p className="text-sm text-gray-400">Veja o seu plano atual, o uso e as opções disponíveis.</p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{error}</p>
      )}
      {feedback && (
        <p className="mb-4 rounded-lg bg-green-50 px-3.5 py-2.5 text-sm text-green-600">{feedback}</p>
      )}

      {/* Plano atual + uso */}
      <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Plano atual</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{currentPlan?.name ?? 'Nenhum'}</p>
            <p className="text-sm text-gray-500">
              {currentPlan
                ? currentPlan.priceInCents === 0
                  ? 'Gratuito'
                  : `${formatPrice(currentPlan.priceInCents)} / ${currentPlan.billingPeriod === 'YEARLY' ? 'ano' : 'mês'}`
                : 'Sua loja ainda não tem uma assinatura.'}
            </p>
            {/* Status visível só quando há algo a resolver (pagamento pendente, pausado...) */}
            {subscription && subscription.status !== 'ACTIVE' && (
              <p className="mt-1 text-xs font-semibold text-orange-500">
                {subscription.status === 'PENDING' && 'Aguardando confirmação do pagamento'}
                {subscription.status === 'PAUSED' && 'Pagamento pendente — assinatura pausada'}
                {subscription.status === 'CANCELLED' && 'Assinatura cancelada'}
              </p>
            )}
          </div>
          {isOwner && isPaidPlan && subscription?.status === 'ACTIVE' && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="shrink-0 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
            >
              {cancelling ? 'Cancelando...' : 'Cancelar assinatura'}
            </button>
          )}
        </div>

        {/* Uso atual comparado aos limites do plano */}
        {usage && currentPlan && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <UsageCard
              icon={Package}
              label="Produtos"
              current={usage.products}
              max={currentPlan.limits.maxProducts}
            />
            <UsageCard
              icon={Users}
              label="Usuários"
              current={usage.users}
              max={currentPlan.limits.maxUsers}
            />
            <UsageCard
              icon={ShoppingBag}
              label="Pedidos no mês"
              current={usage.ordersThisMonth}
              max={currentPlan.limits.maxOrdersPerMonth}
            />
          </div>
        )}
      </div>

      {/* Planos disponíveis */}
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Planos disponíveis</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan?.id && subscription?.status === 'ACTIVE'
          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border bg-white p-5 ${
                isCurrent ? 'border-gray-900' : 'border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-900">{plan.name}</p>
                {isCurrent && (
                  <span className="flex items-center gap-1 rounded-full bg-gray-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    <Check size={11} /> Atual
                  </span>
                )}
              </div>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {plan.priceInCents === 0 ? 'Grátis' : formatPrice(plan.priceInCents)}
                {plan.priceInCents > 0 && (
                  <span className="text-sm font-normal text-gray-400">
                    {' '}/ {plan.billingPeriod === 'YEARLY' ? 'ano' : 'mês'}
                  </span>
                )}
              </p>

              {/* Limites do plano */}
              <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-green-500" />
                  {limitText(plan.limits.maxProducts)} produtos
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-green-500" />
                  {limitText(plan.limits.maxUsers)} usuários
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-green-500" />
                  {limitText(plan.limits.maxOrdersPerMonth)} pedidos por mês
                </li>
              </ul>

              {/* Botão de assinar — apenas o OWNER troca de plano */}
              {isOwner && !isCurrent && (
                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={subscribingId !== null}
                  className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
                >
                  <CreditCard size={15} />
                  {subscribingId === plan.id ? 'Processando...' : plan.priceInCents === 0 ? 'Usar plano gratuito' : 'Assinar'}
                </button>
              )}
            </div>
          )
        })}
        {plans.length === 0 && (
          <p className="text-sm text-gray-400">Nenhum plano disponível no momento.</p>
        )}
      </div>
    </div>
  )
}

// Cartão de uso — mostra quanto do limite já foi consumido, com barra de progresso
function UsageCard({
  icon: Icon,
  label,
  current,
  max,
}: {
  icon: React.ElementType
  label: string
  current: number
  max: number | null | undefined
}) {
  // Sem limite definido = ilimitado, não mostra barra
  const unlimited = max == null
  const percent = unlimited ? 0 : Math.min(100, Math.round((current / max) * 100))
  // Fica laranja a partir de 80% e vermelho quando atinge o limite
  const barColor = percent >= 100 ? 'bg-red-500' : percent >= 80 ? 'bg-orange-400' : 'bg-gray-900'

  return (
    <div className="rounded-xl bg-gray-50 p-3.5">
      <div className="flex items-center gap-2 text-gray-500">
        <Icon size={14} />
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="mt-1.5 text-sm font-semibold text-gray-900">
        {current} <span className="font-normal text-gray-400">/ {unlimited ? 'Ilimitado' : max}</span>
      </p>
      {!unlimited && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  )
}
