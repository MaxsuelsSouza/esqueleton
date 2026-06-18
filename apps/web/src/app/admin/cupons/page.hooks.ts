'use client'

// Hook que concentra toda a lógica de estado e callbacks da página de cupons
import { useState, useEffect } from 'react'
import { couponsService } from '@/modules/coupons/services/coupons.service'
import { catalogService } from '@/modules/catalog/services/catalog.service'
import { categoriesService } from '@/modules/categories/services/categories.service'
import { getMockCoupons, setMockCoupons } from '@/modules/coupons/mocks/coupons-store'
import { buildCategoryTree, flattenCategories, expandSelectedCategories } from '@/modules/categories/utils/categories'
import type { Coupon, ProductOption, Category } from '@esqueleton/shared'
import { buildDiff } from '@/shared/utils/diff'

const USE_MOCK_DATA = false

// Como o desconto será restrito: todos os produtos, por categoria, ou por produto específico
export type RestrictionMode = 'all' | 'categories' | 'products'

export type CouponFormData = Omit<Coupon, 'id' | 'createdAt' | 'usedCount'>

const EMPTY_FORM: CouponFormData = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountPercent: undefined,
  discountValue: undefined,
  minimumOrderValue: undefined,
  maxUses: undefined,
  maxUsesPerUser: undefined,
  productIds: [],
  startDate: undefined,
  endDate: undefined,
  active: true,
}

export function useCuponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [categoryTree, setCategoryTree] = useState<Category[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [form, setForm] = useState<CouponFormData>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasDateRange, setHasDateRange] = useState(false)
  const [hasMaxUses, setHasMaxUses] = useState(false)
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  // Modo de restrição de produtos do cupom
  const [restrictionMode, setRestrictionMode] = useState<RestrictionMode>('all')
  // Categorias selecionadas na UI — expandidas para productIds ao salvar
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    if (USE_MOCK_DATA) {
      setCoupons(getMockCoupons())
      return
    }
    const [couponsData, prodsOptions, catsData] = await Promise.all([
      couponsService.listCoupons(localStorage.getItem('admin_token') ?? ''),
      catalogService.listProductOptions(localStorage.getItem('admin_token') ?? ''),
      categoriesService.listCategories(localStorage.getItem('admin_token') ?? ''),
    ])
    setCoupons(couponsData)
    setProducts(prodsOptions)
    setCategoryTree(buildCategoryTree(catsData))
  }

  async function loadCoupons() {
    if (USE_MOCK_DATA) { setCoupons(getMockCoupons()); return }
    setCoupons(await couponsService.listCoupons(localStorage.getItem('admin_token') ?? ''))
  }

  function openCreateModal() {
    setEditingCoupon(null)
    setForm(EMPTY_FORM)
    setHasDateRange(false)
    setHasMaxUses(false)
    setRestrictionMode('all')
    setSelectedCategoryIds([])
    setFormError(null)
    setModalOpen(true)
  }

  function openEditModal(coupon: Coupon) {
    setEditingCoupon(coupon)
    setForm({
      code: coupon.code,
      description: coupon.description ?? '',
      discountType: coupon.discountType,
      discountPercent: coupon.discountPercent,
      discountValue: coupon.discountValue,
      minimumOrderValue: coupon.minimumOrderValue,
      maxUses: coupon.maxUses,
      maxUsesPerUser: coupon.maxUsesPerUser,
      productIds: coupon.productIds ?? [],
      startDate: coupon.startDate,
      endDate: coupon.endDate,
      active: coupon.active,
    })
    setHasDateRange(!!(coupon.startDate || coupon.endDate))
    setHasMaxUses(coupon.maxUses != null)
    setRestrictionMode(coupon.productIds?.length ? 'products' : 'all')
    setSelectedCategoryIds([])
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    const code = form.code.trim().toUpperCase()
    if (!code) {
      setFormError('O código do cupom é obrigatório.')
      return
    }
    if (!form.discountPercent && !form.discountValue) {
      setFormError('Informe o desconto (% ou R$).')
      return
    }

    // Verifica duplicata localmente antes de chamar a API
    const duplicate = coupons.find((c) => c.code === code && c.id !== editingCoupon?.id)
    if (duplicate) {
      setFormError(`O código "${code}" já está em uso.`)
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
      code,
      productIds: resolvedProductIds,
      maxUses: hasMaxUses ? form.maxUses : undefined,
      startDate: hasDateRange ? form.startDate : undefined,
      endDate: hasDateRange ? form.endDate : undefined,
    }

    if (USE_MOCK_DATA) {
      setCoupons((prev) => {
        const next = editingCoupon
          ? prev.map((c) => (c.id === editingCoupon.id ? { ...c, ...payload } : c))
          : [...prev, { id: `coupon-${Date.now()}`, createdAt: new Date().toISOString(), usedCount: 0, ...payload }]
        setMockCoupons(next)
        return next
      })
      setIsSaving(false)
      setModalOpen(false)
      return
    }

    const token = localStorage.getItem('admin_token') ?? ''
    try {
      if (editingCoupon) {
        const diff = buildDiff(editingCoupon as unknown as Record<string, unknown>, payload)
        if (Object.keys(diff).length === 0) { setIsSaving(false); setModalOpen(false); return }
        await couponsService.updateCoupon(editingCoupon.id, diff, token)
      } else {
        await couponsService.createCoupon(payload, token)
      }
      setModalOpen(false)
      loadCoupons()
    } catch (err: unknown) {
      setFormError((err as Error)?.message ?? 'Erro ao salvar. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingCoupon) return
    setIsDeleting(true)

    if (USE_MOCK_DATA) {
      setCoupons((prev) => {
        const next = prev.filter((c) => c.id !== deletingCoupon.id)
        setMockCoupons(next)
        return next
      })
      setDeletingCoupon(null)
      setIsDeleting(false)
      return
    }

    const token = localStorage.getItem('admin_token') ?? ''
    try {
      await couponsService.deleteCoupon(deletingCoupon.id, token)
      setDeletingCoupon(null)
      loadCoupons()
    } finally {
      setIsDeleting(false)
    }
  }

  async function toggleActive(id: string) {
    const coupon = coupons.find((c) => c.id === id)
    if (!coupon) return

    if (USE_MOCK_DATA) {
      setCoupons((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
        setMockCoupons(next)
        return next
      })
      return
    }

    const token = localStorage.getItem('admin_token') ?? ''
    await couponsService.updateCoupon(id, { active: !coupon.active }, token)
    loadCoupons()
  }

  return {
    coupons,
    products,
    categoryTree,
    modalOpen,
    setModalOpen,
    editingCoupon,
    form,
    setForm,
    formError,
    isSaving,
    hasDateRange,
    setHasDateRange,
    hasMaxUses,
    setHasMaxUses,
    deletingCoupon,
    setDeletingCoupon,
    isDeleting,
    restrictionMode,
    setRestrictionMode,
    selectedCategoryIds,
    setSelectedCategoryIds,
    openCreateModal,
    openEditModal,
    handleSave,
    handleDelete,
    toggleActive,
  }
}

// ── Utilitários ─────────────────────────────────────────────────────────────

export function computeStatus(coupon: Coupon): string {
  if (!coupon.active) return 'Inativo'
  const today = new Date().toISOString().split('T')[0]
  if (coupon.startDate && today < coupon.startDate) return 'Agendado'
  if (coupon.endDate && today > coupon.endDate) return 'Encerrado'
  return 'Ativo'
}

export function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}
