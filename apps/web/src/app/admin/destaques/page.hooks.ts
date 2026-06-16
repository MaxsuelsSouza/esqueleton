'use client'

// Hook de estado e lógica da página de destaques
// Extrai toda a lógica de negócio, efeitos e callbacks para o padrão Container/Presenter

import { useState, useEffect, useMemo } from 'react'
import { featuredService } from '@/modules/featured/services/featured.service'
import { catalogService } from '@/modules/catalog/services/catalog.service'
import { getMockFeatured, setMockFeatured } from '@/modules/featured/mocks/featured-store'
import { getMockProducts } from '@/modules/catalog/mocks/products-store'
import type { Featured, Product, ProductOption } from '@esqueleton/shared'

const USE_MOCK_DATA = false

type FeaturedFormData = Omit<Featured, 'id' | 'createdAt'>

const EMPTY_FORM: FeaturedFormData = {
  title: '',
  tag: '',
  productIds: [],
  startDate: undefined,
  endDate: undefined,
  startTime: undefined,
  endTime: undefined,
  active: false,
  carousel: false,
}

export function useDestaquesPage() {
  const [sections, setSections] = useState<Featured[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<Featured | null>(null)
  const [form, setForm] = useState<FeaturedFormData>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasTimeWindow, setHasTimeWindow] = useState(false)
  const [hasDateRange, setHasDateRange] = useState(false)
  const [deletingSection, setDeletingSection] = useState<Featured | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    if (USE_MOCK_DATA) {
      setSections(getMockFeatured())
      setProducts(getMockProducts())
      return
    }
    const [featured, prodsOptions] = await Promise.all([
      featuredService.listFeatured(localStorage.getItem('admin_token') ?? ''),
      catalogService.listProductOptions(localStorage.getItem('admin_token') ?? ''),
    ])
    setSections(featured)
    setProducts(prodsOptions)
  }

  // Seção atualmente ativa (considera data e horário)
  const activeSection = useMemo(
    () => sections.find((s) => s.active && isWithinSchedule(s)) ?? null,
    [sections],
  )

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.brand?.toLowerCase().includes(productSearch.toLowerCase()),
      ),
    [products, productSearch],
  )

  function openCreateModal() {
    setEditingSection(null)
    setForm(EMPTY_FORM)
    setHasTimeWindow(false)
    setHasDateRange(false)
    setFormError(null)
    setProductSearch('')
    setModalOpen(true)
  }

  function openEditModal(section: Featured) {
    setEditingSection(section)
    setForm({
      title: section.title,
      tag: section.tag,
      productIds: section.productIds,
      startDate: section.startDate,
      endDate: section.endDate,
      startTime: section.startTime,
      endTime: section.endTime,
      active: section.active,
      carousel: section.carousel ?? false,
    })
    setHasTimeWindow(!!(section.startTime || section.endTime))
    setHasDateRange(!!(section.startDate || section.endDate))
    setFormError(null)
    setProductSearch('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setFormError('O título do destaque é obrigatório.')
      return
    }
    if (form.productIds.length === 0) {
      setFormError('Selecione ao menos um produto.')
      return
    }

    setIsSaving(true)
    setFormError(null)

    const payload = {
      ...form,
      title: form.title.trim(),
      tag: form.tag.trim() || 'Destaque',
      startTime: hasTimeWindow ? form.startTime : undefined,
      endTime: hasTimeWindow ? form.endTime : undefined,
      startDate: hasDateRange ? form.startDate : undefined,
      endDate: hasDateRange ? form.endDate : undefined,
    }

    if (USE_MOCK_DATA) {
      setSections((prev) => {
        const updated = editingSection
          ? prev.map((s) => (s.id === editingSection.id ? { ...s, ...payload } : s))
          : [...prev, { id: `featured-${Date.now()}`, createdAt: new Date().toISOString(), ...payload }]
        const final = payload.active
          ? updated.map((s) =>
              s.id === (editingSection?.id ?? updated[updated.length - 1].id) ? s : { ...s, active: false },
            )
          : updated
        setMockFeatured(final)
        return final
      })
      setIsSaving(false)
      setModalOpen(false)
      return
    }

    const token = localStorage.getItem('admin_token') ?? ''
    try {
      if (editingSection) {
        await featuredService.updateFeatured(editingSection.id, payload, token)
      } else {
        await featuredService.createFeatured(payload, token)
      }
      setModalOpen(false)
      loadData()
    } catch {
      setFormError('Erro ao salvar. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingSection) return
    setIsDeleting(true)

    if (USE_MOCK_DATA) {
      setSections((prev) => {
        const next = prev.filter((s) => s.id !== deletingSection.id)
        setMockFeatured(next)
        return next
      })
      setDeletingSection(null)
      setIsDeleting(false)
      return
    }

    const token = localStorage.getItem('admin_token') ?? ''
    try {
      await featuredService.deleteFeatured(deletingSection.id, token)
      setDeletingSection(null)
      loadData()
    } finally {
      setIsDeleting(false)
    }
  }

  // Ativa/desativa a seção — a API garante que só uma fica ativa por vez
  async function handleActivate(id: string) {
    const section = sections.find((s) => s.id === id)
    if (!section) return

    if (USE_MOCK_DATA) {
      setSections((prev) => {
        const next = prev.map((s) => ({ ...s, active: s.id === id ? !s.active : false }))
        setMockFeatured(next)
        return next
      })
      return
    }

    const token = localStorage.getItem('admin_token') ?? ''
    await featuredService.updateFeatured(id, { active: !section.active }, token)
    loadData()
  }

  function toggleProduct(id: string) {
    setForm((f) => ({
      ...f,
      productIds: f.productIds.includes(id)
        ? f.productIds.filter((p) => p !== id)
        : [...f.productIds, id],
    }))
  }

  return {
    sections,
    products,
    modalOpen,
    setModalOpen,
    editingSection,
    form,
    setForm,
    formError,
    isSaving,
    hasTimeWindow,
    setHasTimeWindow,
    hasDateRange,
    setHasDateRange,
    deletingSection,
    setDeletingSection,
    isDeleting,
    productSearch,
    setProductSearch,
    activeSection,
    filteredProducts,
    openCreateModal,
    openEditModal,
    handleSave,
    handleDelete,
    handleActivate,
    toggleProduct,
  }
}

// ── Utilitários ─────────────────────────────────────────────────────────────

// Verifica se a seção está dentro da janela de horário e período definidos
function isWithinSchedule(section: Featured): boolean {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const currentTime = now.toTimeString().slice(0, 5)

  if (section.startDate && today < section.startDate) return false
  if (section.endDate && today > section.endDate) return false
  if (section.startTime && currentTime < section.startTime) return false
  if (section.endTime && currentTime > section.endTime) return false

  return true
}

// Calcula o status visual de uma seção de destaque
export function computeStatus(section: Featured): string {
  if (!section.active) return 'Inativo'

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const currentTime = now.toTimeString().slice(0, 5)

  if (section.startDate && today < section.startDate) return 'Agendado'
  if (section.endDate && today > section.endDate) return 'Encerrado'
  if (section.startTime && currentTime < section.startTime) return 'Fora do horário'
  if (section.endTime && currentTime > section.endTime) return 'Fora do horário'

  return 'Ativo'
}

// Formata uma data ISO para o padrão brasileiro (dd/mm/aa)
export function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}
