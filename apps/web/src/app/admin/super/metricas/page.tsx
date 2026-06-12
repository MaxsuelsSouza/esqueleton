'use client'

// Métricas da plataforma (super-admin) — totais, MRR e assinaturas por plano
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { superService } from '@/services/super.service'
import type { PlatformMetrics } from '@esqueleton/shared'
import { Building2, CheckCircle2, Ban, Users, Wallet } from 'lucide-react'

// Converte centavos em texto de preço (ex: 4990 → "R$ 49,90")
function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function SuperMetricasPage() {
  const { token, isSuperAdmin, isChecking } = useAdminAuth()
  const router = useRouter()

  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isChecking && !isSuperAdmin) {
      router.replace('/admin/dashboard')
      return
    }
    if (!token) return
    superService
      .metrics(token)
      .then(setMetrics)
      .catch(() => setError('Não foi possível carregar as métricas.'))
      .finally(() => setLoading(false))
  }, [token, isChecking, isSuperAdmin, router])

  if (isChecking || loading) {
    return <div className="flex min-h-[50vh] items-center justify-center" />
  }

  // Maior contagem entre os planos — usada para dimensionar as barras do gráfico
  const maxCount = Math.max(1, ...(metrics?.subscriptionsByPlan.map((p) => p.count) ?? [1]))

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Métricas da plataforma</h1>
        <p className="text-sm text-gray-400">Visão geral do SaaS: lojas, usuários e receita.</p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{error}</p>
      )}

      {metrics && (
        <>
          {/* Cartões de totais */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard icon={Building2} label="Lojas" value={String(metrics.totalStores)} />
            <MetricCard icon={CheckCircle2} label="Ativas" value={String(metrics.activeStores)} accent="text-green-600" />
            <MetricCard icon={Ban} label="Suspensas" value={String(metrics.suspendedStores)} accent="text-red-500" />
            <MetricCard icon={Users} label="Usuários" value={String(metrics.totalUsers)} />
            <MetricCard icon={Wallet} label="MRR" value={formatPrice(metrics.mrrInCents)} accent="text-green-600" />
          </div>

          {/* Assinaturas ativas por plano */}
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Assinaturas ativas por plano
            </p>
            {metrics.subscriptionsByPlan.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma assinatura ativa ainda.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {metrics.subscriptionsByPlan.map((item) => (
                  <div key={item.planId}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{item.planName}</span>
                      <span className="text-gray-500">{item.count} loja{item.count === 1 ? '' : 's'}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gray-900"
                        style={{ width: `${Math.round((item.count / maxCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Cartão de métrica — ícone, rótulo e valor
function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex items-center gap-2 text-gray-400">
        <Icon size={14} />
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className={`mt-1.5 text-xl font-bold ${accent ?? 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
