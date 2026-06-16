'use client'

// Hook com toda a lógica de estado e callbacks da página de planos (super-admin).
// Segue o padrão Container/Presenter — a página importa este hook e renderiza a view.
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/modules/auth/hooks/useAdminAuth'
import { superService } from '@/modules/super/services/super.service'
import type { SuperPlan, PlanInput } from '@esqueleton/shared'

// Campos do formulário — preço em reais como texto, convertido ao salvar
type PlanFormData = {
  name: string
  slug: string
  maxProducts: string
  maxUsers: string
  maxOrdersPerMonth: string
  priceInReais: string
  billingPeriod: 'MONTHLY' | 'YEARLY'
  sortOrder: string
  active: boolean
}

const EMPTY_FORM: PlanFormData = {
  name: '',
  slug: '',
  maxProducts: '',
  maxUsers: '',
  maxOrdersPerMonth: '',
  priceInReais: '',
  billingPeriod: 'MONTHLY',
  sortOrder: '0',
  active: true,
}

// Converte centavos em texto de preço (ex: 4990 → "R$ 49,90")
export function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function useSuperPlanosPage() {
  const { token, isSuperAdmin, isChecking } = useAdminAuth()
  const router = useRouter()

  const [plans, setPlans] = useState<SuperPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Formulário de criação/edição — editingPlan nulo significa "criando"
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SuperPlan | null>(null)
  const [formData, setFormData] = useState<PlanFormData>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadPlans = useCallback(async () => {
    if (!token) return
    try {
      const data = await superService.listPlans(token)
      setPlans(data)
    } catch {
      setError('Não foi possível carregar os planos.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!isChecking && !isSuperAdmin) {
      router.replace('/admin/dashboard')
      return
    }
    if (token) loadPlans()
  }, [token, isChecking, isSuperAdmin, router, loadPlans])

  function openCreateForm() {
    setEditingPlan(null)
    setFormData(EMPTY_FORM)
    setFormError(null)
    setShowForm(true)
  }

  function openEditForm(plan: SuperPlan) {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      slug: plan.slug,
      maxProducts: plan.limits.maxProducts != null ? String(plan.limits.maxProducts) : '',
      maxUsers: plan.limits.maxUsers != null ? String(plan.limits.maxUsers) : '',
      maxOrdersPerMonth: plan.limits.maxOrdersPerMonth != null ? String(plan.limits.maxOrdersPerMonth) : '',
      priceInReais: plan.priceInCents > 0 ? String(plan.priceInCents / 100) : '0',
      billingPeriod: plan.billingPeriod,
      sortOrder: String(plan.sortOrder),
      active: plan.active,
    })
    setFormError(null)
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return

    if (!formData.name.trim()) {
      setFormError('O nome do plano é obrigatório.')
      return
    }
    const preco = Number(formData.priceInReais.replace(',', '.'))
    if (isNaN(preco) || preco < 0) {
      setFormError('Informe um preço válido (0 para gratuito).')
      return
    }

    // Campos vazios de limite significam ilimitado (null)
    const payload: PlanInput = {
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      limits: {
        maxProducts: formData.maxProducts !== '' ? Number(formData.maxProducts) : null,
        maxUsers: formData.maxUsers !== '' ? Number(formData.maxUsers) : null,
        maxOrdersPerMonth: formData.maxOrdersPerMonth !== '' ? Number(formData.maxOrdersPerMonth) : null,
      },
      priceInCents: Math.round(preco * 100),
      billingPeriod: formData.billingPeriod,
      sortOrder: Number(formData.sortOrder) || 0,
      active: formData.active,
    }

    setSaving(true)
    setFormError(null)
    try {
      if (editingPlan) {
        await superService.updatePlan(editingPlan.id, payload, token)
      } else {
        await superService.createPlan(payload, token)
      }
      setShowForm(false)
      await loadPlans()
    } catch (err: unknown) {
      setFormError((err as { message?: string })?.message || 'Erro ao salvar o plano.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(plan: SuperPlan) {
    if (!token) return
    if (!confirm(`Desativar o plano "${plan.name}"? Ele deixa de aparecer para novas assinaturas.`)) return

    setDeletingId(plan.id)
    try {
      await superService.deletePlan(plan.id, token)
      await loadPlans()
    } catch (err: unknown) {
      alert((err as { message?: string })?.message || 'Erro ao desativar o plano.')
    } finally {
      setDeletingId(null)
    }
  }

  return {
    plans,
    loading,
    error,
    isChecking,
    showForm,
    setShowForm,
    editingPlan,
    formData,
    setFormData,
    formError,
    saving,
    deletingId,
    openCreateForm,
    openEditForm,
    handleSave,
    handleDeactivate,
  }
}
