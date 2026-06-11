'use client'

// Página de gestão de seções em destaque
// Apenas uma seção pode estar ativa por vez — ativar uma desativa as demais automaticamente
import { useState, useEffect, useMemo } from 'react'
import {
  Plus, Pencil, Trash2, X, Clock, Calendar,
  Sparkles, ToggleLeft, ToggleRight, Search,
} from 'lucide-react'
import { featuredService } from '@/services/featured.service'
import { catalogService } from '@/services/catalog.service'
import { getMockFeatured, setMockFeatured } from '@/mocks/featured-store'
import { getMockProducts } from '@/mocks/products-store'
import type { Featured, ProductOption } from '@esqueleton/shared'

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
}

export default function AdminDestaquesPage() {
  const [sections, setSections] = useState<Featured[]>([])
  const [products, setProducts] = useState<Product[]>([])

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
      catalogService.listProductOptions(),
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

  return (
    <div className="flex flex-col gap-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Destaques</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Apenas um destaque pode estar ativo por vez.{' '}
            {activeSection
              ? <span className="font-medium text-green-600">"{activeSection.title}" está ativo agora.</span>
              : <span className="text-gray-400">Nenhum ativo no momento.</span>}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
        >
          <Plus size={16} />
          Novo destaque
        </button>
      </div>

      {/* Lista vazia */}
      {sections.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-gray-400">
          <Sparkles size={40} strokeWidth={1.5} />
          <p className="text-sm">Nenhum destaque criado ainda.</p>
          <button
            onClick={openCreateModal}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Criar primeiro destaque
          </button>
        </div>
      )}

      {/* Cards de destaque */}
      <div className="flex flex-col gap-3">
        {sections.map((section) => {
          const status = computeStatus(section)
          const sectionProducts = products.filter((p) => section.productIds.includes(p.id))

          return (
            <div
              key={section.id}
              className={`rounded-2xl border bg-white p-4 transition-opacity ${!section.active ? 'opacity-60' : 'border-blue-100 bg-blue-50/30'}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">

                {/* Informações */}
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold text-gray-900">{section.title}</h2>
                    <span className="rounded-full bg-blue-500 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                      {section.tag}
                    </span>
                    <StatusBadge status={status} />
                  </div>

                  {/* Produtos */}
                  <p className="text-xs text-gray-500">
                    {sectionProducts.length === 0
                      ? 'Nenhum produto'
                      : sectionProducts.map((p) => p.brand ? `${p.brand} ${p.name}` : p.name).join(' · ')}
                  </p>

                  {/* Restrições de tempo */}
                  <div className="flex flex-wrap gap-3">
                    {(section.startTime || section.endTime) && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={11} />
                        {section.startTime ?? '?'} – {section.endTime ?? '?'}
                      </span>
                    )}
                    {(section.startDate || section.endDate) && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar size={11} />
                        {section.startDate ? formatDate(section.startDate) : '?'} até{' '}
                        {section.endDate ? formatDate(section.endDate) : '?'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                  {/* Toggle ativo */}
                  <button
                    onClick={() => handleActivate(section.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      section.active
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {section.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    {section.active ? 'Ativo' : 'Inativo'}
                  </button>

                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(section)}
                      aria-label="Editar"
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeletingSection(section)}
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
        })}
      </div>

      {/* Modal criar/editar */}
      {modalOpen && (
        <Modal title={editingSection ? 'Editar destaque' : 'Novo destaque'} onClose={() => setModalOpen(false)}>
          <div className="flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Título</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Ofertas da semana"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>
                Tag <span className="text-xs font-normal text-gray-400">(badge no canto direito)</span>
              </label>
              <input
                type="text"
                value={form.tag}
                onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}
                placeholder="Ex: Oferta, Novo, Exclusivo"
                className={inputClass}
              />
            </div>

            {/* Seleção de produtos */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>
                Produtos{' '}
                <span className="text-xs font-normal text-gray-400">
                  ({form.productIds.length} selecionado{form.productIds.length !== 1 ? 's' : ''})
                </span>
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar produto..."
                  className="w-full rounded-xl border border-gray-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-gray-900"
                />
              </div>
              <div className="flex max-h-52 flex-col gap-0.5 overflow-y-auto rounded-xl border border-gray-100 p-1">
                {filteredProducts.map((product) => (
                  <label
                    key={product.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={form.productIds.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="h-3.5 w-3.5 rounded accent-gray-900"
                    />
                    <div className="min-w-0 flex-1">
                      {product.brand && (
                        <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">
                          {product.brand}
                        </p>
                      )}
                      <p className="truncate text-sm text-gray-700">{product.name}</p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Janela de horário */}
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <Toggle value={hasTimeWindow} onChange={setHasTimeWindow} />
                <Clock size={14} className="text-gray-400" />
                Restringir horário
              </label>
              {hasTimeWindow && (
                <div className="flex items-center gap-2 pl-11">
                  <input
                    type="time"
                    value={form.startTime ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value || undefined }))}
                    className={inputClass}
                  />
                  <span className="text-gray-400">até</span>
                  <input
                    type="time"
                    value={form.endTime ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value || undefined }))}
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            {/* Período */}
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <Toggle value={hasDateRange} onChange={setHasDateRange} />
                <Calendar size={14} className="text-gray-400" />
                Definir período
              </label>
              {hasDateRange && (
                <div className="flex items-center gap-2 pl-11">
                  <input
                    type="date"
                    value={form.startDate ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value || undefined }))}
                    className={inputClass}
                  />
                  <span className="text-gray-400">até</span>
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
              <Toggle
                value={form.active}
                onChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
              <span className="text-sm text-gray-700">
                {form.active ? 'Ativo' : 'Inativo'}
              </span>
              {form.active && (
                <span className="text-xs text-orange-500">
                  Os outros destaques serão desativados automaticamente.
                </span>
              )}
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
      {deletingSection && (
        <Modal title="Excluir destaque" onClose={() => setDeletingSection(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Tem certeza que deseja excluir{' '}
              <span className="font-semibold text-gray-900">"{deletingSection.title}"</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingSection(null)}
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
    'Fora do horário': 'bg-orange-100 text-orange-600',
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

function computeStatus(section: Featured): string {
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
