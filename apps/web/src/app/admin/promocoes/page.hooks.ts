'use client'

// Hook com toda a lógica da página de promoções — estado, efeitos e callbacks
import { useState, useEffect, useRef } from 'react'
import { promotionsService } from '@/modules/promotions/services/promotions.service'
import { catalogService } from '@/modules/catalog/services/catalog.service'
import { categoriesService } from '@/modules/categories/services/categories.service'
import { getMockPromotions, setMockPromotions } from '@/modules/promotions/mocks/promotions-store'
import { getMockProducts } from '@/modules/catalog/mocks/products-store'
import { buildCategoryTree, flattenCategories, expandSelectedCategories } from '@/modules/categories/utils/categories'
import type { Promotion, ProductOption, Category } from '@esqueleton/shared'
import { buildDiff } from '@/shared/utils/diff'

const USE_MOCK_DATA = false

// Como o desconto será restrito: todos os produtos, por categoria, ou por produto específico
type RestrictionMode = 'all' | 'categories' | 'products'

type PromotionFormData = Omit<Promotion, 'id' | 'createdAt'>

const EMPTY_FORM: PromotionFormData = {
  name: '',
  type: 'percentage',
  discountPercent: undefined,
  discountValue: undefined,
  buyQuantity: undefined,
  getQuantity: undefined,
  kitPrice: undefined,
  productIds: [],
  startTime: undefined,
  endTime: undefined,
  startDate: undefined,
  endDate: undefined,
  description: '',
  color: '#f97316',
  active: true,
  priority: 0,
}

export type { RestrictionMode, PromotionFormData }
export { EMPTY_FORM }

export function usePromocoesPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [categoryTree, setCategoryTree] = useState<Category[]>([])
  // Modo de restrição de produtos da promoção
  const [restrictionMode, setRestrictionMode] = useState<RestrictionMode>('all')
  // Categorias selecionadas na UI — expandidas para productIds ao salvar
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [form, setForm] = useState<PromotionFormData>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingPromotion, setDeletingPromotion] = useState<Promotion | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Controles opcionais do formulário
  const [hasTimeWindow, setHasTimeWindow] = useState(false)
  const [hasDateRange, setHasDateRange] = useState(false)
  // Controla se a borda colorida será exibida no catálogo
  const [hasColor, setHasColor] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    if (USE_MOCK_DATA) {
      setPromotions(getMockPromotions())
      setProducts(getMockProducts())
      return
    }
    const [promos, prodsOptions, catsData] = await Promise.all([
      promotionsService.listPromotions(localStorage.getItem('admin_token') ?? ''),
      catalogService.listProductOptions(localStorage.getItem('admin_token') ?? ''),
      categoriesService.listCategories(localStorage.getItem('admin_token') ?? ''),
    ])
    setPromotions(promos)
    setProducts(prodsOptions)
    setCategoryTree(buildCategoryTree(catsData))
  }

  function openCreateModal() {
    setEditingPromotion(null)
    setForm(EMPTY_FORM)
    setHasTimeWindow(false)
    setHasDateRange(false)
    setHasColor(true)
    setRestrictionMode('all')
    setSelectedCategoryIds([])
    setFormError(null)
    setModalOpen(true)
  }

  function openEditModal(promo: Promotion) {
    setEditingPromotion(promo)
    setForm({
      name: promo.name,
      type: promo.type,
      discountPercent: promo.discountPercent,
      discountValue: promo.discountValue,
      buyQuantity: promo.buyQuantity,
      getQuantity: promo.getQuantity,
      kitPrice: promo.kitPrice,
      productIds: promo.productIds,
      startTime: promo.startTime,
      endTime: promo.endTime,
      startDate: promo.startDate,
      endDate: promo.endDate,
      description: promo.description ?? '',
      color: promo.color ?? '#f97316',
      active: promo.active,
      priority: promo.priority,
    })
    setHasTimeWindow(!!(promo.startTime || promo.endTime))
    setHasDateRange(!!(promo.startDate || promo.endDate))
    setHasColor(!!promo.color)
    setRestrictionMode(promo.productIds?.length ? 'products' : 'all')
    setSelectedCategoryIds([])
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('O nome da promoção é obrigatório.')
      return
    }

    setIsSaving(true)
    setFormError(null)

    // Resolve os productIds com base no modo de restrição escolhido
    let resolvedProductIds: string[] = []
    if (restrictionMode === 'products') {
      resolvedProductIds = form.productIds ?? []
    } else if (restrictionMode === 'categories' && selectedCategoryIds.length > 0) {
      // Expande as categorias selecionadas (incluindo subcategorias) e coleta os produtos
      const flatCats = flattenCategories(categoryTree)
      const expandedCatIds = expandSelectedCategories(selectedCategoryIds, flatCats)
      resolvedProductIds = products
        .filter((p) => p.categoryIds?.some((cid) => expandedCatIds.has(cid)))
        .map((p) => p.id)
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      productIds: resolvedProductIds,
      startTime: hasTimeWindow ? form.startTime : undefined,
      endTime: hasTimeWindow ? form.endTime : undefined,
      startDate: hasDateRange ? form.startDate : undefined,
      endDate: hasDateRange ? form.endDate : undefined,
      // Quando o toggle de cor está desligado, envia null para limpar no banco
      color: hasColor ? form.color : null,
    }

    if (USE_MOCK_DATA) {
      setPromotions((prev) => {
        const next = editingPromotion
          ? prev.map((p) => (p.id === editingPromotion.id ? { ...p, ...payload } : p))
          : [...prev, { id: `promo-${Date.now()}`, createdAt: new Date().toISOString(), ...payload }]
        setMockPromotions(next)
        return next
      })
      setIsSaving(false)
      setModalOpen(false)
      return
    }

    const token = localStorage.getItem('admin_token') ?? ''
    try {
      if (editingPromotion) {
        const diff = buildDiff(editingPromotion as unknown as Record<string, unknown>, payload)
        if (Object.keys(diff).length === 0) { setIsSaving(false); setModalOpen(false); return }
        await promotionsService.updatePromotion(editingPromotion.id, diff, token)
      } else {
        await promotionsService.createPromotion(payload, token)
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
    if (!deletingPromotion) return
    setIsDeleting(true)

    if (USE_MOCK_DATA) {
      setPromotions((prev) => {
        const next = prev.filter((p) => p.id !== deletingPromotion.id)
        setMockPromotions(next)
        return next
      })
      setDeletingPromotion(null)
      setIsDeleting(false)
      return
    }

    const token = localStorage.getItem('admin_token') ?? ''
    try {
      await promotionsService.deletePromotion(deletingPromotion.id, token)
      setDeletingPromotion(null)
      loadData()
    } finally {
      setIsDeleting(false)
    }
  }

  async function toggleActive(id: string) {
    const promo = promotions.find((p) => p.id === id)
    if (!promo) return

    if (USE_MOCK_DATA) {
      setPromotions((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
        setMockPromotions(next)
        return next
      })
      return
    }

    const token = localStorage.getItem('admin_token') ?? ''
    await promotionsService.updatePromotion(id, { active: !promo.active }, token)
    loadData()
  }

  // ── Drag-and-drop para reordenar prioridade ──
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  function handleDragStart(index: number) {
    dragIndexRef.current = index
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    setDragOverIndex(index)
  }

  function handleDragEnd() {
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  async function handleDrop(targetIndex: number) {
    const fromIndex = dragIndexRef.current
    if (fromIndex === null || fromIndex === targetIndex) {
      handleDragEnd()
      return
    }

    // Reordena localmente para feedback imediato
    const reordered = [...promotions]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    setPromotions(reordered)
    handleDragEnd()

    // Persiste no servidor
    if (!USE_MOCK_DATA) {
      const token = localStorage.getItem('admin_token') ?? ''
      await promotionsService.reorderPromotions(reordered.map((p) => p.id), token)
    }
  }

  return {
    promotions,
    products,
    categoryTree,
    restrictionMode,
    setRestrictionMode,
    selectedCategoryIds,
    setSelectedCategoryIds,
    modalOpen,
    setModalOpen,
    editingPromotion,
    form,
    setForm,
    formError,
    isSaving,
    deletingPromotion,
    setDeletingPromotion,
    isDeleting,
    hasTimeWindow,
    setHasTimeWindow,
    hasDateRange,
    setHasDateRange,
    hasColor,
    setHasColor,
    openCreateModal,
    openEditModal,
    handleSave,
    handleDelete,
    toggleActive,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  }
}
