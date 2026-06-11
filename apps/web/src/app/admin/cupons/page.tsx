'use client'

// Página de gestão de cupons de desconto
import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Calendar, Copy, Check, Ticket, ChevronRight, ChevronDown, Search } from 'lucide-react'
import { couponsService } from '@/services/coupons.service'
import { catalogService } from '@/services/catalog.service'
import { categoriesService } from '@/services/categories.service'
import { getMockCoupons, setMockCoupons } from '@/mocks/coupons-store'
import { buildCategoryTree, flattenCategories, expandSelectedCategories } from '@/utils/categories'
import type { Coupon, ProductOption, Category } from '@esqueleton/shared'

const USE_MOCK_DATA = false

// Como o desconto será restrito: todos os produtos, por categoria, ou por produto específico
type RestrictionMode = 'all' | 'categories' | 'products'

type CouponFormData = Omit<Coupon, 'id' | 'createdAt' | 'usedCount'>

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

export default function AdminCuponsPage() {
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
      catalogService.listProductOptions(),
      categoriesService.listCategories(),
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
        await couponsService.updateCoupon(editingCoupon.id, payload, token)
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

  return (
    <div className="flex flex-col gap-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Cupons</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {coupons.length} cupom{coupons.length !== 1 ? 'ns' : ''} cadastrado{coupons.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
        >
          <Plus size={16} />
          Novo cupom
        </button>
      </div>

      {/* Lista vazia */}
      {coupons.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-gray-400">
          <Ticket size={40} strokeWidth={1.5} />
          <p className="text-sm">Nenhum cupom cadastrado ainda.</p>
          <button
            onClick={openCreateModal}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Criar primeiro cupom
          </button>
        </div>
      )}

      {/* Tabela de cupons */}
      {coupons.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3">Código</th>
                <th className="hidden px-4 py-3 sm:table-cell">Desconto</th>
                <th className="hidden px-4 py-3 md:table-cell">Usos</th>
                <th className="hidden px-4 py-3 lg:table-cell">Validade</th>
                <th className="px-4 py-3">Status</th>
                <th className="w-24 px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {coupons.map((coupon) => {
                const status = computeStatus(coupon)
                const isExhausted = coupon.maxUses != null && coupon.usedCount >= coupon.maxUses

                return (
                  <tr key={coupon.id} className={`transition-colors hover:bg-gray-50 ${!coupon.active ? 'opacity-50' : ''}`}>

                    {/* Código + descrição */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CopyCodeButton code={coupon.code} />
                        <div>
                          <p className="font-mono font-bold tracking-wider text-gray-900">
                            {coupon.code}
                          </p>
                          {coupon.description && (
                            <p className="text-xs text-gray-400">{coupon.description}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Desconto */}
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="font-medium text-gray-800">
                        {coupon.discountType === 'percentage'
                          ? `${coupon.discountPercent}%`
                          : `R$ ${coupon.discountValue?.toFixed(2).replace('.', ',')}`}
                      </span>
                      {coupon.minimumOrderValue && (
                        <p className="text-xs text-gray-400">
                          Mín. {coupon.minimumOrderValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      )}
                    </td>

                    {/* Usos */}
                    <td className="hidden px-4 py-3 md:table-cell">
                      {coupon.maxUses !== undefined ? (
                        <div className="flex flex-col gap-1">
                          <span className={`text-sm ${isExhausted ? 'text-red-500' : 'text-gray-700'}`}>
                            {coupon.usedCount} / {coupon.maxUses}
                          </span>
                          {/* Barra de progresso de usos */}
                          <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={`h-full rounded-full ${isExhausted ? 'bg-red-400' : 'bg-gray-400'}`}
                              style={{ width: `${Math.min((coupon.usedCount / coupon.maxUses) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">{coupon.usedCount} / ∞</span>
                      )}
                    </td>

                    {/* Validade */}
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {coupon.startDate || coupon.endDate ? (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar size={11} />
                          {coupon.startDate ? formatDate(coupon.startDate) : '?'}
                          {' – '}
                          {coupon.endDate ? formatDate(coupon.endDate) : '∞'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Sem prazo</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(coupon.id)}
                        title={coupon.active ? 'Clique para desativar' : 'Clique para ativar'}
                      >
                        <StatusBadge status={isExhausted ? 'Esgotado' : status} />
                      </button>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(coupon)}
                          aria-label="Editar"
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeletingCoupon(coupon)}
                          aria-label="Excluir"
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal criar/editar */}
      {modalOpen && (
        <Modal title={editingCoupon ? 'Editar cupom' : 'Novo cupom'} onClose={() => setModalOpen(false)}>
          <div className="flex flex-col gap-4">

            {/* Código */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Código do cupom</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="Ex: VERAO20"
                className={`${inputClass} font-mono tracking-wider uppercase`}
                maxLength={20}
              />
              <p className="text-xs text-gray-400">Letras maiúsculas, sem espaço. O cliente digita esse código.</p>
            </div>

            {/* Descrição */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>
                Descrição <span className="text-xs font-normal text-gray-400">(opcional)</span>
              </label>
              <input
                type="text"
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Desconto de boas-vindas para novos clientes"
                className={inputClass}
              />
            </div>

            {/* Tipo de desconto */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Tipo de desconto</label>
              <div className="grid grid-cols-2 gap-2">
                {(['percentage', 'fixed'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, discountType: type }))}
                    className={`rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                      form.discountType === type
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {type === 'percentage' ? 'Porcentagem (%)' : 'Valor fixo (R$)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Valor do desconto */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>
                {form.discountType === 'percentage' ? 'Desconto (%)' : 'Desconto (R$)'}
              </label>
              {form.discountType === 'percentage' ? (
                <input
                  type="number" min={1} max={100}
                  value={form.discountPercent ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="Ex: 20"
                  className={inputClass}
                />
              ) : (
                <input
                  type="number" min={0} step={0.01}
                  value={form.discountValue ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="Ex: 50,00"
                  className={inputClass}
                />
              )}
            </div>

            {/* Valor mínimo do pedido */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>
                Valor mínimo do pedido (R$) <span className="text-xs font-normal text-gray-400">(opcional)</span>
              </label>
              <input
                type="number" min={0} step={0.01}
                value={form.minimumOrderValue ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, minimumOrderValue: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="Sem valor mínimo"
                className={inputClass}
              />
            </div>

            {/* Limite de usos */}
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <Toggle value={hasMaxUses} onChange={setHasMaxUses} />
                Limitar número de usos
              </label>
              {hasMaxUses && (
                <div className="grid grid-cols-2 gap-3 pl-11">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Total de usos</label>
                    <input
                      type="number" min={1}
                      value={form.maxUses ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder="Ex: 100"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Por pessoa</label>
                    <input
                      type="number" min={1}
                      value={form.maxUsesPerUser ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, maxUsesPerUser: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder="Ex: 1"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Restrição de produtos */}
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Aplicar desconto a</label>
              <div className="flex flex-col gap-1">
                {([
                  { value: 'all', label: 'Todos os produtos' },
                  { value: 'categories', label: 'Categorias específicas' },
                  { value: 'products', label: 'Produtos específicos' },
                ] as const).map(({ value, label }) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-gray-50">
                    <input
                      type="radio"
                      name="restrictionMode"
                      checked={restrictionMode === value}
                      onChange={() => { setRestrictionMode(value); setSelectedCategoryIds([]); setForm(f => ({ ...f, productIds: [] })) }}
                      className="accent-gray-900"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>

              {/* Seletor de categorias */}
              {restrictionMode === 'categories' && (
                <div className="mt-1">
                  {categoryTree.length === 0 ? (
                    <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-400">
                      Nenhuma categoria cadastrada.
                    </p>
                  ) : (
                    <CategoryCheckboxTree
                      categories={categoryTree}
                      selectedIds={selectedCategoryIds}
                      onChange={setSelectedCategoryIds}
                    />
                  )}
                  {selectedCategoryIds.length > 0 && (() => {
                    const flatCats = flattenCategories(categoryTree)
                    const expanded = expandSelectedCategories(selectedCategoryIds, flatCats)
                    const count = products.filter(p => p.categoryIds?.some(cid => expanded.has(cid))).length
                    return (
                      <p className="mt-1.5 text-xs text-gray-500">
                        {count} produto{count !== 1 ? 's' : ''} incluído{count !== 1 ? 's' : ''}
                      </p>
                    )
                  })()}
                </div>
              )}

              {/* Seletor de produtos */}
              {restrictionMode === 'products' && (
                <ProductSelector
                  products={products}
                  selectedIds={form.productIds ?? []}
                  onChange={(ids) => setForm((f) => ({ ...f, productIds: ids }))}
                />
              )}
            </div>

            {/* Período de vigência */}
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <Toggle value={hasDateRange} onChange={setHasDateRange} />
                <Calendar size={14} className="text-gray-400" />
                Definir período de validade
              </label>
              {hasDateRange && (
                <div className="flex items-center gap-2 pl-11">
                  <input
                    type="date"
                    value={form.startDate ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value || undefined }))}
                    className={inputClass}
                  />
                  <span className="shrink-0 text-gray-400">até</span>
                  <input
                    type="date"
                    value={form.endDate ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value || undefined }))}
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            {/* Ativo */}
            <label className="flex cursor-pointer items-center gap-2">
              <Toggle value={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} />
              <span className="text-sm text-gray-700">{form.active ? 'Ativo' : 'Inativo'}</span>
            </label>

            {formError && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{formError}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-60"
              >
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmação de exclusão */}
      {deletingCoupon && (
        <Modal title="Excluir cupom" onClose={() => setDeletingCoupon(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Tem certeza que deseja excluir o cupom{' '}
              <span className="font-mono font-bold text-gray-900">"{deletingCoupon.code}"</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingCoupon(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Componentes auxiliares ──────────────────────────────────────────────────

// Árvore de categorias com checkboxes para o seletor de restrição
function CategoryCheckboxTree({
  categories,
  selectedIds,
  onChange,
  level = 0,
}: {
  categories: Category[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  level?: number
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(categories.map((c) => c.id)),
  )

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelect(id: string) {
    const updated = selectedIds.includes(id)
      ? selectedIds.filter((s) => s !== id)
      : [...selectedIds, id]
    onChange(updated)
  }

  return (
    <div className={`rounded-xl border border-gray-200 ${level === 0 ? 'p-2' : ''}`}>
      {categories.map((cat) => {
        const hasChildren = !!cat.children?.length
        const isExpanded = expandedIds.has(cat.id)
        return (
          <div key={cat.id} className={level > 0 ? 'ml-4 border-l border-gray-100 pl-2' : ''}>
            <div className="flex items-center gap-1 rounded-lg px-1 py-1 hover:bg-gray-50">
              <button
                type="button"
                onClick={() => toggleExpand(cat.id)}
                className={`flex h-4 w-4 shrink-0 items-center justify-center text-gray-400 ${!hasChildren ? 'invisible' : ''}`}
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(cat.id)}
                  onChange={() => toggleSelect(cat.id)}
                  className="h-3.5 w-3.5 rounded accent-gray-900"
                />
                {cat.name}
              </label>
            </div>
            {hasChildren && isExpanded && (
              <CategoryCheckboxTree
                categories={cat.children!}
                selectedIds={selectedIds}
                onChange={onChange}
                level={level + 1}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Lista de produtos com busca e checkboxes para o seletor de restrição
function ProductSelector({
  products,
  selectedIds,
  onChange,
}: {
  products: Product[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  const [search, setSearch] = useState('')

  const filtered = products.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      (p.brand ?? '').toLowerCase().includes(q)
    )
  })

  function toggleProduct(id: string) {
    const updated = selectedIds.includes(id)
      ? selectedIds.filter((s) => s !== id)
      : [...selectedIds, id]
    onChange(updated)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Campo de busca */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto..."
          className="w-full rounded-xl border border-gray-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-gray-400"
        />
      </div>

      {products.length === 0 ? (
        <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-400">
          Nenhum produto cadastrado.
        </p>
      ) : (
        <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">Nenhum produto encontrado.</p>
          ) : (
            filtered.map((product) => (
              <label
                key={product.id}
                className="flex cursor-pointer items-center gap-3 border-b border-gray-50 px-3 py-2.5 last:border-0 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(product.id)}
                  onChange={() => toggleProduct(product.id)}
                  className="h-3.5 w-3.5 accent-gray-900"
                />
                <div className="min-w-0">
                  {product.brand && (
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{product.brand}</p>
                  )}
                  <p className="truncate text-sm text-gray-800">{product.name}</p>
                </div>
                <span className="ml-auto shrink-0 text-xs text-gray-500">
                  {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </label>
            ))
          )}
        </div>
      )}

      {selectedIds.length > 0 && (
        <p className="text-xs text-gray-500">
          {selectedIds.length} produto{selectedIds.length !== 1 ? 's' : ''} selecionado{selectedIds.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

// Botão que copia o código do cupom com feedback visual
function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="Copiar código"
      title={copied ? 'Copiado!' : 'Copiar código'}
      className={`shrink-0 rounded-lg p-1.5 transition-colors ${
        copied ? 'text-green-500' : 'text-gray-300 hover:text-gray-500'
      }`}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

// Toggle reutilizável
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      className={`flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
        value ? 'bg-gray-900' : 'bg-gray-300'
      }`}
    >
      <span
        className={`mx-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          value ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Ativo: 'bg-green-100 text-green-700',
    Inativo: 'bg-gray-100 text-gray-500',
    Agendado: 'bg-yellow-100 text-yellow-700',
    Encerrado: 'bg-red-100 text-red-600',
    Esgotado: 'bg-orange-100 text-orange-600',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[status] ?? styles['Inativo']}`}>
      {status}
    </span>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

// ── Utilitários ─────────────────────────────────────────────────────────────

function computeStatus(coupon: Coupon): string {
  if (!coupon.active) return 'Inativo'
  const today = new Date().toISOString().split('T')[0]
  if (coupon.startDate && today < coupon.startDate) return 'Agendado'
  if (coupon.endDate && today > coupon.endDate) return 'Encerrado'
  return 'Ativo'
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

const inputClass =
  'w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900'

const labelClass = 'text-sm font-medium text-gray-700'
