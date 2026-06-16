'use client'

// Onboarding da assinatura — explica o modelo ("pagou, usou"), mostra a situação
// do período de teste e leva ao pagamento recorrente no MercadoPago.
// O cartão é cadastrado no checkout seguro do MercadoPago (nada de cartão aqui);
// quando o pagamento é aprovado, o webhook ativa a assinatura automaticamente.
import Link from 'next/link'
import { CheckCircle2, CreditCard, Rocket, ShieldCheck, Clock, AlertTriangle } from 'lucide-react'
import { useAssinaturaPage } from './page.hooks'
import type { Plan } from '@esqueleton/shared'

// Converte centavos em texto de preço (ex: 4990 → "R$ 49,90")
function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function AssinaturaPage() {
  const {
    isChecking,
    isOwner,
    loading,
    error,
    plans,
    subscribingId,
    pendingMessage,
    trial,
    hasActiveSubscription,
    isPending,
    handleSubscribe,
  } = useAssinaturaPage()

  if (isChecking || loading) {
    return <div className="flex min-h-[50vh] items-center justify-center" />
  }

  // Assinatura já ativa — nada a fazer aqui
  if (hasActiveSubscription) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <CheckCircle2 size={48} className="mx-auto text-green-500" />
        <h1 className="mt-4 text-lg font-semibold text-gray-900">Sua assinatura está ativa!</h1>
        <p className="mt-1 text-sm text-gray-500">Sua loja está no ar para os clientes.</p>
        <Link
          href="/admin/plano"
          className="mt-6 inline-block rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700"
        >
          Ver meu plano
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">

      {/* Situação atual — teste vigente, teste vencido ou pagamento pendente */}
      {isPending || pendingMessage ? (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <Clock size={18} className="mt-0.5 shrink-0 text-blue-500" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Pagamento em processamento</p>
            <p className="mt-0.5 text-sm text-blue-700">
              Assim que o MercadoPago confirmar o pagamento, sua loja é ativada automaticamente —
              não precisa fazer mais nada.
            </p>
          </div>
        </div>
      ) : trial?.active ? (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <Clock size={18} className="mt-0.5 shrink-0 text-orange-500" />
          <div>
            <p className="text-sm font-semibold text-orange-800">
              Período de teste: {trial.daysLeft === 1 ? 'falta 1 dia' : `faltam ${trial.daysLeft} dias`}
            </p>
            <p className="mt-0.5 text-sm text-orange-700">
              Sua loja está no ar normalmente. Quando o teste acabar, o catálogo sai do ar
              para os clientes até a assinatura ser ativada.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-800">Sua loja está fora do ar para os clientes</p>
            <p className="mt-0.5 text-sm text-red-700">
              O período de teste terminou. Ative a assinatura para colocar o catálogo de volta no ar —
              tudo o que você cadastrou continua guardado.
            </p>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Ative sua loja</h1>
        <p className="mt-1 text-sm text-gray-500">
          Com a assinatura ativa, seu catálogo fica no ar 24h por dia, com pedidos chegando
          direto no seu WhatsApp.
        </p>
      </div>

      {/* Como funciona — em 3 passos simples */}
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <CreditCard size={18} className="text-gray-400" />
          <p className="mt-2 text-sm font-semibold text-gray-900">1. Escolha o plano</p>
          <p className="mt-1 text-xs text-gray-500">
            O pagamento é recorrente, renovado automaticamente pelo MercadoPago.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <ShieldCheck size={18} className="text-gray-400" />
          <p className="mt-2 text-sm font-semibold text-gray-900">2. Cadastre o cartão</p>
          <p className="mt-1 text-xs text-gray-500">
            No checkout seguro do MercadoPago. Cancele quando quiser, sem multa.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <Rocket size={18} className="text-gray-400" />
          <p className="mt-2 text-sm font-semibold text-gray-900">3. Loja no ar</p>
          <p className="mt-1 text-xs text-gray-500">
            Pagamento aprovado, ativação automática — sem espera e sem burocracia.
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{error}</p>
      )}

      {/* Aviso para membros da equipe — só o dono assina */}
      {!isOwner && (
        <p className="mb-4 rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm text-gray-500">
          Apenas o proprietário da loja pode ativar a assinatura.
        </p>
      )}

      {/* Planos disponíveis */}
      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => (
          <div key={plan.id} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5">
            <p className="font-semibold text-gray-900">{plan.name}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatPrice(plan.priceInCents)}
              <span className="text-sm font-normal text-gray-400">
                {' '}/ {plan.billingPeriod === 'YEARLY' ? 'ano' : 'mês'}
              </span>
            </p>
            <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500" />
                {plan.limits.maxProducts ?? 'Ilimitados'} produtos
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500" />
                {plan.limits.maxUsers ?? 'Ilimitados'} usuários
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500" />
                {plan.limits.maxOrdersPerMonth ?? 'Ilimitados'} pedidos por mês
              </li>
            </ul>
            {isOwner && (
              <button
                onClick={() => handleSubscribe(plan)}
                disabled={subscribingId !== null}
                className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
              >
                <CreditCard size={15} />
                {subscribingId === plan.id ? 'Abrindo o pagamento...' : 'Assinar e ativar'}
              </button>
            )}
          </div>
        ))}
        {plans.length === 0 && (
          <p className="text-sm text-gray-400">
            Nenhum plano disponível no momento. Entre em contato com o suporte.
          </p>
        )}
      </div>
    </div>
  )
}
