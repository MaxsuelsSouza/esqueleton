'use client'

// Hook que gerencia estado e efeitos da página de métricas da plataforma (super-admin)
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/modules/auth/hooks/useAdminAuth'
import { superService } from '@/modules/super/services/super.service'
import type { PlatformMetrics } from '@esqueleton/shared'

export function useSuperMetricasPage() {
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

  // Maior contagem entre os planos — usada para dimensionar as barras do gráfico
  const maxCount = Math.max(1, ...(metrics?.subscriptionsByPlan.map((p) => p.count) ?? [1]))

  return { metrics, loading, error, isChecking, maxCount }
}
