'use client'

// Página do plano — mostra a assinatura atual, o uso dos limites e os planos
// disponíveis. Trocar de plano e cancelar são ações exclusivas do OWNER.
import { useState, useEffect } from 'react'
import type { Plan, Invoice, BillingUsage, PlanLimits } from '@esqueleton/shared'
import { Check, CreditCard, ExternalLink, X } from 'lucide-react'
import { usePlanoPage } from './page.hooks'

// Converte centavos em texto de preço (ex: 4990 → "R$ 49,90")
function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Data da fatura em pt-BR (ex: "6 de jul. de 2026")
function formatInvoiceDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Status do Stripe traduzido para exibição
function invoiceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    paid: 'Pago',
    open: 'Em aberto',
    void: 'Anulada',
    uncollectible: 'Não recebida',
    draft: 'Rascunho',
  }
  return labels[status] ?? status
}

// Texto do limite — null/ausente significa ilimitado
function limitText(value: number | null | undefined): string {
  return value == null ? 'Ilimitado' : String(value)
}

export default function PlanoPage() {
  const {
    isChecking,
    isOwner,
    loading,
    error,
    feedback,
    plans,
    subscribingId,
    cancelling,
    subscription,
    usage,
    currentPlan,
    isPaidPlan,
    handleSubscribe,
    handleCancel,
    invoices,
    invoicesLoading,
    invoicesHasMore,
    loadingMoreInvoices,
    loadMoreInvoices,
  } = usePlanoPage()

  if (isChecking || loading) {
    return <div className="flex min-h-[50vh] items-center justify-center" />
  }

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

      {/* Plano atual — só o essencial: nome, preço, status e a ação de cancelar */}
      <div className="mb-2 rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
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
      </div>

      {/* Uso do plano — uma linha discreta abaixo do card, fora do foco principal */}
      {usage && currentPlan && (
        <UsageSummary usage={usage} limits={currentPlan.limits} />
      )}

      {/* Histórico de faturas — só aparece quando há alguma */}
      <InvoicesSection
        invoices={invoices}
        loading={invoicesLoading}
        hasMore={invoicesHasMore}
        loadingMore={loadingMoreInvoices}
        onLoadMore={loadMoreInvoices}
      />

      {/* Trocar de plano — só o OWNER; abre um modal com os planos disponíveis */}
      {isOwner && (
        <ChangePlan
          plans={plans}
          currentPlan={currentPlan}
          subscription={subscription}
          subscribingId={subscribingId}
          onSubscribe={handleSubscribe}
        />
      )}
    </div>
  )
}

// Uso do plano em uma linha discreta: "12/50 produtos · 2/2 usuários · 30/100 pedidos".
// Cada número fica laranja perto do limite e vermelho ao atingi-lo. Ilimitado = "∞".
function UsageSummary({ usage, limits }: { usage: BillingUsage; limits: PlanLimits }) {
  const items = [
    { label: 'produtos', current: usage.products, max: limits.maxProducts },
    { label: 'usuários', current: usage.users, max: limits.maxUsers },
    { label: 'pedidos no mês', current: usage.ordersThisMonth, max: limits.maxOrdersPerMonth },
  ]

  return (
    <p className="mb-8 px-1 text-xs text-gray-400">
      {items.map((item, index) => {
        const { current, max } = item
        // max == null significa ilimitado — os guards `max != null` deixam o TS
        // estreitar o tipo para number dentro das comparações
        const atingiu = max != null && current >= max
        const proximo = max != null && !atingiu && current / max >= 0.8
        const cor = atingiu ? 'text-red-500' : proximo ? 'text-orange-500' : 'text-gray-500'
        return (
          <span key={item.label}>
            {index > 0 && <span className="mx-1.5 text-gray-300">·</span>}
            <span className={`font-medium ${cor}`}>
              {current}/{max == null ? '∞' : max}
            </span>{' '}
            {item.label}
          </span>
        )
      })}
    </p>
  )
}

// Troca de plano — um botão discreto que abre um modal com os planos.
// A página fica limpa; escolher outro plano vira uma ação intencional.
// Só é renderizado para o OWNER.
function ChangePlan(props: {
  plans: Plan[]
  currentPlan: Plan | null | undefined
  subscription: { status: string } | null | undefined
  subscribingId: string | null
  onSubscribe: (plan: Plan) => void
}) {
  const [open, setOpen] = useState(false)

  if (props.plans.length === 0) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mb-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
      >
        <CreditCard size={16} />
        Trocar de plano
      </button>

      {open && <PlansModal {...props} onClose={() => setOpen(false)} />}
    </>
  )
}

// Modal com os planos disponíveis. Fecha ao clicar fora, no X ou com Esc.
// Entrada suave (fade + leve zoom) via estado "visible" após a montagem.
function PlansModal({
  plans,
  currentPlan,
  subscription,
  subscribingId,
  onSubscribe,
  onClose,
}: {
  plans: Plan[]
  currentPlan: Plan | null | undefined
  subscription: { status: string } | null | undefined
  subscribingId: string | null
  onSubscribe: (plan: Plan) => void
  onClose: () => void
}) {
  const [visible, setVisible] = useState(false)

  // Anima a entrada e fecha com a tecla Esc
  useEffect(() => {
    setVisible(true)
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl transition-all duration-200 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Trocar de plano</h2>
            <p className="text-sm text-gray-400">Escolha o plano ideal para a sua loja.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan?.id && subscription?.status === 'ACTIVE'
            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-2xl border p-5 ${
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

                {!isCurrent && (
                  <button
                    onClick={() => onSubscribe(plan)}
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
        </div>
      </div>
    </div>
  )
}

// Histórico de faturas — sempre visível. Mostra as faturas reais do Stripe;
// enquanto carrega, um aviso; e, sem nenhuma fatura, uma mensagem de vazio.
function InvoicesSection({
  invoices,
  loading,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  invoices: Invoice[]
  loading: boolean
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
}) {
  return (
    <div className="mb-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Faturas</p>
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">Carregando faturas...</p>
        ) : invoices.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">
            Nenhuma fatura ainda. Suas cobranças aparecerão aqui.
          </p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 text-gray-700">{formatInvoiceDate(invoice.createdAt)}</td>
                    <td className="px-5 py-3 text-gray-900">{formatPrice(invoice.amountInCents)}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          invoice.status === 'paid'
                            ? 'bg-green-50 text-green-600'
                            : invoice.status === 'open'
                              ? 'bg-orange-50 text-orange-600'
                              : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {invoiceStatusLabel(invoice.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {invoice.hostedInvoiceUrl ? (
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-500"
                        >
                          Ver <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {hasMore && (
              <div className="border-t border-gray-100 p-3 text-center">
                <button
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  {loadingMore ? 'Carregando...' : 'Carregar mais'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
