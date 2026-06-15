'use client'

// Página de promoções — crie qualquer tipo de promoção de forma livre
// O tipo é apenas um rótulo visual; todos os campos estão sempre disponíveis
import { useState, useEffect, useRef } from 'react'
import {
  Plus, Pencil, Trash2, X, Clock, Calendar,
  BadgePercent, PackageSearch, ToggleLeft, ToggleRight, Search,
  ChevronDown, ChevronRight, GripVertical,
} from 'lucide-react'
import { promotionsService } from '@/services/promotions.service'
import { catalogService } from '@/services/catalog.service'
import { categoriesService } from '@/services/categories.service'
import { getMockPromotions, setMockPromotions } from '@/mocks/promotions-store'
import { getMockProducts } from '@/mocks/products-store'
import { buildCategoryTree, flattenCategories, expandSelectedCategories } from '@/utils/categories'
import type { Promotion, PromotionType, ProductOption, Category } from '@esqueleton/shared'

const USE_MOCK_DATA = false

// Rótulos e cores de cada tipo de promoção
const PROMOTION_TYPES: { value: PromotionType; label: string; color: string }[] = [
  { value: 'percentage', label: 'Desconto %', color: 'bg-blue-100 text-blue-700' },
  { value: 'fixed', label: 'Desconto R$', color: 'bg-green-100 text-green-700' },
  { value: 'buy_x_get_y', label: 'Compre X Leve Y', color: 'bg-purple-100 text-purple-700' },
  { value: 'kit', label: 'Kit', color: 'bg-orange-100 text-orange-700' },
  { value: 'custom', label: 'Personalizada', color: 'bg-gray-100 text-gray-700' },
]

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

// Cores predefinidas para seleção rápida
const PRESET_COLORS = [
  { label: 'Laranja', value: '#f97316' },
  { label: 'Vermelho', value: '#ef4444' },
  { label: 'Rosa', value: '#ec4899' },
  { label: 'Roxo', value: '#8b5cf6' },
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Verde', value: '#22c55e' },
  { label: 'Amarelo', value: '#eab308' },
  { label: 'Preto', value: '#111827' },
]

export default function AdminPromocoesPage() {
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
      // Quando o toggle de cor está desligado, envia undefined — sem borda no catálogo
      color: hasColor ? form.color : undefined,
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
        await promotionsService.updatePromotion(editingPromotion.id, payload, token)
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

  return (
    <div className="flex flex-col gap-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Promoções</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {promotions.length} promoção{promotions.length !== 1 ? 'ões' : ''} cadastrada{promotions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
        >
          <Plus size={16} />
          Nova promoção
        </button>
      </div>

      {/* Lista vazia */}
      {promotions.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-gray-400">
          <BadgePercent size={40} strokeWidth={1.5} />
          <p className="text-sm">Nenhuma promoção cadastrada ainda.</p>
          <button
            onClick={openCreateModal}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Criar primeira promoção
          </button>
        </div>
      )}

      {/* Cards de promoção — arrastar para reordenar prioridade */}
      {promotions.length > 1 && (
        <p className="text-xs text-gray-400">Arraste para reordenar — a primeira promoção tem prioridade sobre as demais.</p>
      )}
      <div className="flex flex-col gap-3">
        {promotions.map((promo, index) => (
          <div
            key={promo.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onDrop={() => handleDrop(index)}
            className={`transition-all ${
              dragOverIndex === index ? 'border-t-2 border-gray-900' : ''
            }`}
          >
            <PromotionCard
              promo={promo}
              products={products}
              position={index + 1}
              onEdit={() => openEditModal(promo)}
              onDelete={() => setDeletingPromotion(promo)}
              onToggleActive={() => toggleActive(promo.id)}
            />
          </div>
        ))}
      </div>

      {/* Modal criar/editar */}
      {modalOpen && (
        <PromotionModal
          form={form}
          setForm={setForm}
          hasTimeWindow={hasTimeWindow}
          setHasTimeWindow={setHasTimeWindow}
          hasDateRange={hasDateRange}
          setHasDateRange={setHasDateRange}
          hasColor={hasColor}
          setHasColor={setHasColor}
          products={products}
          categoryTree={categoryTree}
          restrictionMode={restrictionMode}
          setRestrictionMode={setRestrictionMode}
          selectedCategoryIds={selectedCategoryIds}
          setSelectedCategoryIds={setSelectedCategoryIds}
          formError={formError}
          isEditing={!!editingPromotion}
          isSaving={isSaving}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Confirmação de exclusão */}
      {deletingPromotion && (
        <Modal title="Excluir promoção" onClose={() => setDeletingPromotion(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Tem certeza que deseja excluir{' '}
              <span className="font-semibold text-gray-900">"{deletingPromotion.name}"</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingPromotion(null)}
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

// ── Card de promoção na listagem ────────────────────────────────────────────

function PromotionCard({
  promo,
  products,
  position,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  promo: Promotion
  products: ProductOption[]
  position: number
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}) {
  const typeInfo = PROMOTION_TYPES.find((t) => t.value === promo.type)!

  // Calcula o status da promoção com base nas datas e no toggle ativo
  const status = computeStatus(promo)

  // Resumo da regra de desconto
  const ruleSummary = getRuleSummary(promo)

  const selectedProducts = products.filter((p) => promo.productIds.includes(p.id))

  return (
    <div className={`rounded-2xl border bg-white p-4 transition-opacity ${!promo.active ? 'opacity-60' : ''}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">

        {/* Alça de arrastar + número da posição */}
        <div className="flex shrink-0 cursor-grab items-center gap-1 text-gray-300 active:cursor-grabbing sm:flex-col sm:items-center sm:pt-1">
          <GripVertical size={18} />
          <span className="text-[10px] font-bold text-gray-400">{position}º</span>
        </div>

        {/* Informações principais */}
        <div className="flex flex-1 flex-col gap-2">

          {/* Nome e badges */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Bolinha com a cor da borda do card */}
            {promo.color && (
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: promo.color }}
                title={`Cor da borda: ${promo.color}`}
              />
            )}
            <h2 className="text-sm font-bold text-gray-900">{promo.name}</h2>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
            <StatusBadge status={status} />
          </div>

          {/* Regra de desconto */}
          {ruleSummary && (
            <p className="text-sm font-medium text-gray-700">{ruleSummary}</p>
          )}

          {/* Produtos selecionados */}
          <p className="text-xs text-gray-400">
            {selectedProducts.length === 0
              ? 'Nenhum produto selecionado'
              : selectedProducts.length === 1
              ? `1 produto: ${selectedProducts[0].name}`
              : `${selectedProducts.length} produtos`}
          </p>

          {/* Restrições de tempo */}
          <div className="flex flex-wrap gap-3">
            {(promo.startTime || promo.endTime) && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock size={12} />
                {promo.startTime ?? '?'} – {promo.endTime ?? '?'}
              </span>
            )}
            {(promo.startDate || promo.endDate) && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar size={12} />
                {promo.startDate ? formatDate(promo.startDate) : '?'} até{' '}
                {promo.endDate ? formatDate(promo.endDate) : '?'}
              </span>
            )}
          </div>

          {/* Observações */}
          {promo.description && (
            <p className="text-xs italic text-gray-400">{promo.description}</p>
          )}
        </div>

        {/* Ações */}
        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
          {/* Toggle ativo/inativo */}
          <button
            onClick={onToggleActive}
            aria-label={promo.active ? 'Desativar' : 'Ativar'}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              promo.active
                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {promo.active
              ? <ToggleRight size={14} />
              : <ToggleLeft size={14} />}
            {promo.active ? 'Ativa' : 'Inativa'}
          </button>

          <div className="flex gap-1">
            <button
              onClick={onEdit}
              aria-label="Editar"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDelete}
              aria-label="Excluir"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal do formulário de promoção ────────────────────────────────────────

function PromotionModal({
  form, setForm,
  hasTimeWindow, setHasTimeWindow,
  hasDateRange, setHasDateRange,
  hasColor, setHasColor,
  products, categoryTree,
  restrictionMode, setRestrictionMode,
  selectedCategoryIds, setSelectedCategoryIds,
  formError, isEditing, isSaving,
  onSave, onClose,
}: {
  form: PromotionFormData
  setForm: React.Dispatch<React.SetStateAction<PromotionFormData>>
  hasTimeWindow: boolean
  setHasTimeWindow: (v: boolean) => void
  hasDateRange: boolean
  setHasDateRange: (v: boolean) => void
  hasColor: boolean
  setHasColor: (v: boolean) => void
  products: ProductOption[]
  categoryTree: Category[]
  restrictionMode: RestrictionMode
  setRestrictionMode: (v: RestrictionMode) => void
  selectedCategoryIds: string[]
  setSelectedCategoryIds: (ids: string[]) => void
  formError: string | null
  isEditing: boolean
  isSaving: boolean
  onSave: () => void
  onClose: () => void
}) {
  function set<K extends keyof PromotionFormData>(key: K, value: PromotionFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <Modal title={isEditing ? 'Editar promoção' : 'Nova promoção'} onClose={onClose} wide>
      <div className="flex flex-col gap-5">

        {/* ── Identificação ── */}
        <Section title="Identificação">
          <div className="flex flex-col gap-3">

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Nome da promoção</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ex: Happy Hour de Perfumes"
                className={inputClass}
              />
            </div>

            {/* Tipo — apenas um rótulo, não bloqueia campos */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>
                Tipo
                <span className="ml-1 text-xs font-normal text-gray-400">(visual — não restringe os campos)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PROMOTION_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set('type', t.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      form.type === t.value
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle + seletor de cor da borda */}
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <div
                  onClick={() => setHasColor(!hasColor)}
                  className={`flex h-5 w-9 items-center rounded-full transition-colors ${
                    hasColor ? 'bg-gray-900' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`mx-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      hasColor ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
                Exibir borda colorida no catálogo
              </label>

              {hasColor && (
                <div className="flex flex-col gap-2 pl-11">
                  <div className="flex flex-wrap items-center gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        title={c.label}
                        onClick={() => set('color', c.value)}
                        className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: c.value,
                          borderColor: form.color === c.value ? '#111827' : 'transparent',
                          outline: form.color === c.value ? '2px solid #111827' : 'none',
                          outlineOffset: '2px',
                        }}
                      />
                    ))}
                    {/* Input de cor personalizada */}
                    <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-2.5 py-1.5">
                      <input
                        type="color"
                        value={form.color ?? '#f97316'}
                        onChange={(e) => set('color', e.target.value)}
                        className="h-5 w-5 cursor-pointer rounded border-none bg-transparent p-0"
                        title="Cor personalizada"
                      />
                      <span className="font-mono text-xs text-gray-500">{form.color ?? '#f97316'}</span>
                    </div>
                  </div>
                  {/* Preview da borda */}
                  <div
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-gray-500"
                    style={{ border: `2px solid ${form.color ?? '#f97316'}` }}
                  >
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: form.color ?? '#f97316' }}
                    >
                      {form.name || 'Preview da tag'}
                    </span>
                    Assim ficará o card do produto
                  </div>
                </div>
              )}
            </div>

            {/* Toggle ativo */}
            <label className="flex cursor-pointer items-center gap-2">
              <div
                onClick={() => set('active', !form.active)}
                className={`flex h-5 w-9 items-center rounded-full transition-colors ${
                  form.active ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`mx-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    form.active ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
              <span className="text-sm text-gray-700">{form.active ? 'Ativa' : 'Inativa'}</span>
            </label>
          </div>
        </Section>

        {/* ── Benefício / Regra ── */}
        <Section title="Benefício">
          <div className="flex flex-col gap-3">

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Desconto %</label>
                <input
                  type="number" min={0} max={100}
                  value={form.discountPercent ?? ''}
                  onChange={(e) => set('discountPercent', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Ex: 20"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Desconto R$</label>
                <input
                  type="number" min={0} step={0.01}
                  value={form.discountValue ?? ''}
                  onChange={(e) => set('discountValue', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Ex: 50,00"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Compre</label>
                <input
                  type="number" min={1}
                  value={form.buyQuantity ?? ''}
                  onChange={(e) => set('buyQuantity', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Ex: 2"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Leve</label>
                <input
                  type="number" min={1}
                  value={form.getQuantity ?? ''}
                  onChange={(e) => set('getQuantity', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Ex: 3"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Preço do kit (R$)</label>
              <input
                type="number" min={0} step={0.01}
                value={form.kitPrice ?? ''}
                onChange={(e) => set('kitPrice', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Ex: 199,90"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>
                Observações
                <span className="ml-1 text-xs font-normal text-gray-400">(descreva qualquer regra adicional)</span>
              </label>
              <textarea
                value={form.description ?? ''}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Ex: O produto de menor valor sai de graça ao levar 3 itens..."
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
        </Section>

        {/* ── Produtos ── */}
        <Section title="Produtos">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              {([
                { value: 'all', label: 'Todos os produtos' },
                { value: 'categories', label: 'Categorias específicas' },
                { value: 'products', label: 'Produtos específicos' },
              ] as const).map(({ value, label }) => (
                <label key={value} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-gray-50">
                  <input
                    type="radio"
                    name="promoRestrictionMode"
                    checked={restrictionMode === value}
                    onChange={() => { setRestrictionMode(value); setSelectedCategoryIds([]); setForm(f => ({ ...f, productIds: [] })) }}
                    className="accent-gray-900"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>

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

            {restrictionMode === 'products' && (
              <ProductSelector
                products={products}
                selectedIds={form.productIds ?? []}
                onChange={(ids) => setForm((f) => ({ ...f, productIds: ids }))}
              />
            )}
          </div>
        </Section>

        {/* ── Restrições de tempo ── */}
        <Section title="Validade">
          <div className="flex flex-col gap-3">

            {/* Janela de horário */}
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <div
                  onClick={() => setHasTimeWindow(!hasTimeWindow)}
                  className={`flex h-5 w-9 items-center rounded-full transition-colors ${
                    hasTimeWindow ? 'bg-gray-900' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`mx-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      hasTimeWindow ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
                <Clock size={14} className="text-gray-400" />
                Restringir horário
              </label>
              {hasTimeWindow && (
                <div className="flex items-center gap-2 pl-11">
                  <input
                    type="time"
                    value={form.startTime ?? ''}
                    onChange={(e) => set('startTime', e.target.value || undefined)}
                    className={inputClass}
                  />
                  <span className="text-gray-400">até</span>
                  <input
                    type="time"
                    value={form.endTime ?? ''}
                    onChange={(e) => set('endTime', e.target.value || undefined)}
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            {/* Período de vigência */}
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <div
                  onClick={() => setHasDateRange(!hasDateRange)}
                  className={`flex h-5 w-9 items-center rounded-full transition-colors ${
                    hasDateRange ? 'bg-gray-900' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`mx-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      hasDateRange ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
                <Calendar size={14} className="text-gray-400" />
                Definir período
              </label>
              {hasDateRange && (
                <div className="flex items-center gap-2 pl-11">
                  <input
                    type="date"
                    value={form.startDate ?? ''}
                    onChange={(e) => set('startDate', e.target.value || undefined)}
                    className={inputClass}
                  />
                  <span className="text-gray-400">até</span>
                  <input
                    type="date"
                    value={form.endDate ?? ''}
                    onChange={(e) => set('endDate', e.target.value || undefined)}
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          </div>
        </Section>

        {formError && (
          <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{formError}</p>
        )}

        <div className="flex gap-3 border-t pt-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-60"
          >
            {isSaving ? 'Salvando...' : 'Salvar promoção'}
          </button>
        </div>
      </div>
    </Modal>
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
  products: ProductOption[]
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      {children}
    </div>
  )
}

function Modal({
  title, onClose, wide = false, children,
}: {
  title: string
  onClose: () => void
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl ${wide ? 'max-w-lg' : 'max-w-sm'}`}>
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Ativa: 'bg-green-100 text-green-700',
    Inativa: 'bg-gray-100 text-gray-500',
    Agendada: 'bg-yellow-100 text-yellow-700',
    Encerrada: 'bg-red-100 text-red-600',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[status] ?? styles['Inativa']}`}>
      {status}
    </span>
  )
}

// ── Utilitários ─────────────────────────────────────────────────────────────

function computeStatus(promo: Promotion): string {
  if (!promo.active) return 'Inativa'

  const today = new Date().toISOString().split('T')[0]
  if (promo.startDate && today < promo.startDate) return 'Agendada'
  if (promo.endDate && today > promo.endDate) return 'Encerrada'

  return 'Ativa'
}

function getRuleSummary(promo: Promotion): string | null {
  if (promo.discountPercent) return `${promo.discountPercent}% de desconto`
  if (promo.discountValue) return `R$ ${promo.discountValue.toFixed(2).replace('.', ',')} de desconto`
  if (promo.buyQuantity && promo.getQuantity) return `Compre ${promo.buyQuantity} leve ${promo.getQuantity}`
  if (promo.kitPrice) return `Kit por R$ ${promo.kitPrice.toFixed(2).replace('.', ',')}`
  return null
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
