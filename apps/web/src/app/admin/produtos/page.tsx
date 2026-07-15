'use client'

// Página de gestão de produtos — listagem com ações de criar, editar e excluir
import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, X, PackageSearch, ImagePlus, ChevronLeft, ChevronRight, ChevronDown, Search, ListPlus, Eye, EyeOff } from 'lucide-react'
import { compressImage } from '@/modules/catalog/utils/image'
import { ImageUploader } from '@/modules/catalog/components/ImageUploader'
import { VariantsEditor } from '@/modules/catalog/components/VariantsEditor'
import type { Product, Category, ProductCharacteristic } from '@esqueleton/shared'
import { useProdutosPage } from './page.hooks'

export default function AdminProdutosPage() {
  const {
    products,
    categories,
    isLoading,
    error,
    page,
    setPage,
    total,
    totalPages,
    search,
    setSearch,
    filterCategory,
    setFilterCategory,
    sortBy,
    setSortBy,
    searchFocused,
    setSearchFocused,
    activeFilterCount,
    clearFilters,
    pageProducts,
    flatCats,
    modalOpen,
    setModalOpen,
    editingId,
    formData,
    setFormData,
    isSaving,
    formError,
    openCreateModal,
    openEditModal,
    isEditLoading,
    handleSave,
    deletingProduct,
    setDeletingProduct,
    isDeleting,
    handleDelete,
    togglingId,
    handleToggleAvailability,
  } = useProdutosPage()

  return (
    <div className="flex flex-col gap-6">

      {/* Cabeçalho da página */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Produtos</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {isLoading ? '' : activeFilterCount > 0
              ? `${total} produto${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`
              : `${total} produto${total !== 1 ? 's' : ''} cadastrado${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
        >
          <Plus size={16} />
          Novo produto
        </button>
      </div>

      {/* Barra de filtros — fica fixa enquanto houver produtos OU filtros ativos.
          Sem a condição de filtros ativos, um filtro sem resultado esconderia o
          próprio card, deixando o usuário sem como limpar a busca (a não ser recarregar). */}
      {!isLoading && (products.length > 0 || activeFilterCount > 0) && (
        <div className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-3 sm:p-4">
          <div className="flex flex-col gap-2">

            {/* Linha 1: busca + categoria (categoria desce ao focar na busca) */}
            <div className="flex flex-wrap gap-2">

              {/* Busca */}
              <div className="relative flex-1 min-w-0">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Buscar..."
                  className="w-full rounded-xl border border-gray-200 py-2 pl-8 pr-8 text-sm outline-none focus:border-gray-900"
                  style={{ color: '#111827' }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Ordenação — sempre ao lado da busca */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-gray-900"
              >
                <option value="newest">Mais recentes</option>
                <option value="name">Nome A–Z</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
              </select>
            </div>

            {/* Linha 2: categoria sempre abaixo */}
            {flatCats.length > 0 && (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-fit rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-gray-900"
              >
                <option value="">Todas as categorias</option>
                {flatCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {'　'.repeat(c.depth)}{c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Botão limpar filtros */}
          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {activeFilterCount} filtro{activeFilterCount !== 1 ? 's' : ''} ativo{activeFilterCount !== 1 ? 's' : ''}
              </span>
              <button
                onClick={clearFilters}
                className="text-xs font-medium text-gray-400 hover:text-gray-700"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Erro ao carregar */}
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Estado de carregamento */}
      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {/* Lista vazia */}
      {!isLoading && pageProducts.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-gray-400">
          <PackageSearch size={40} strokeWidth={1.5} />
          <p className="text-sm">
            {activeFilterCount > 0 ? 'Nenhum produto corresponde aos filtros.' : 'Nenhum produto cadastrado ainda.'}
          </p>
          {/* O botão só faz sentido quando a loja está realmente vazia.
              Com um filtro ativo, a loja tem produtos — mostrar "primeiro produto"
              confundiria; o usuário deve ajustar/limpar o filtro no card acima. */}
          {activeFilterCount === 0 && (
            <button
              onClick={openCreateModal}
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Cadastrar primeiro produto
            </button>
          )}
        </div>
      )}

      {/* Tabela de produtos */}
      {!isLoading && pageProducts.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                <th className="w-12 px-4 py-3" />
                <th className="px-4 py-3">Produto</th>
                <th className="hidden w-24 px-4 py-3 text-center sm:table-cell">Disponível</th>
                <th className="w-24 px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pageProducts.map((product) => (
                <tr key={product.id} className={`transition-colors hover:bg-gray-50 ${!product.isAvailable ? 'opacity-50' : ''}`}>

                  {/* Foto */}
                  <td className="pl-4 py-3 w-12">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                          <ImagePlus size={14} strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Nome e marca */}
                  <td className="px-4 py-3">
                    {product.brand && (
                      <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">
                        {product.brand}
                      </p>
                    )}
                    <p className="font-medium text-gray-900">{product.name}</p>
                    {/* Indicador mobile de indisponível (a coluna toggle fica oculta no mobile) */}
                    {!product.isAvailable && (
                      <p className="mt-0.5 text-[10px] font-medium text-red-500 sm:hidden">Indisponível</p>
                    )}
                  </td>

                  {/* Toggle de disponibilidade — oculto no mobile */}
                  <td className="hidden px-4 py-3 text-center sm:table-cell">
                    <button
                      onClick={() => handleToggleAvailability(product)}
                      disabled={togglingId === product.id}
                      aria-label={product.isAvailable ? 'Marcar como indisponível' : 'Marcar como disponível'}
                      title={product.isAvailable ? 'Visível no catálogo' : 'Oculto do catálogo'}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                        product.isAvailable ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                          product.isAvailable ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </td>

                  {/* Botões de ação */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Toggle no mobile (inline com as ações) */}
                      <button
                        onClick={() => handleToggleAvailability(product)}
                        disabled={togglingId === product.id}
                        aria-label={product.isAvailable ? 'Marcar como indisponível' : 'Marcar como disponível'}
                        className={`rounded-lg p-1.5 transition-colors sm:hidden ${
                          product.isAvailable
                            ? 'text-green-500 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        } disabled:opacity-50`}
                      >
                        {product.isAvailable ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                      <button
                        onClick={() => openEditModal(product)}
                        aria-label="Editar produto"
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeletingProduct(product)}
                        aria-label="Excluir produto"
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de criar / editar produto */}
      {modalOpen && (
        <Modal
          title={editingId ? 'Editar produto' : 'Novo produto'}
          subtitle={editingId ? 'Atualize as informações do produto' : 'Preencha os dados do novo produto'}
          onClose={() => setModalOpen(false)}
          size="lg"
          footer={
            <div className="flex flex-col gap-3">
              {formError && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{formError}</p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || isEditLoading}
                  className="rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:opacity-60"
                >
                  {isSaving ? 'Salvando...' : 'Salvar produto'}
                </button>
              </div>
            </div>
          }
        >
          <div className="flex flex-col gap-7">

            {/* Ao editar, a listagem é enxuta — variantes, fotos extras e características
                chegam nesta busca. Enquanto isso, os dados básicos já ficam editáveis. */}
            {isEditLoading && (
              <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm text-blue-600">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
                Carregando variantes, fotos e características...
              </div>
            )}

            {/* Bloco superior: dados à esquerda, imagens à direita */}
            <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">

              {/* Coluna 1 — informações básicas e categorias */}
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4">
                  <SectionTitle>Informações básicas</SectionTitle>

                  <FormField label="Nome do produto" required>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Ex: Galaxy S24 Ultra"
                      maxLength={200}
                      className={inputClass}
                    />
                  </FormField>

                  {/* Marca e preço lado a lado — ocupam melhor a largura */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Marca" optional>
                      <input
                        type="text"
                        value={formData.brand}
                        onChange={(e) => setFormData((f) => ({ ...f, brand: e.target.value }))}
                        placeholder="Ex: Samsung"
                        className={inputClass}
                      />
                    </FormField>

                    <FormField label="Preço (R$)" required>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData((f) => ({ ...f, price: e.target.value }))}
                        placeholder="0,00"
                        className={inputClass}
                      />
                    </FormField>
                  </div>
                </div>

                {categories.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <SectionTitle>Organização</SectionTitle>
                    <FormField label="Categorias" optional>
                      <CategoryCheckboxTree
                        categories={categories}
                        selectedIds={formData.categoryIds}
                        onChange={(ids) => setFormData((f) => ({ ...f, categoryIds: ids }))}
                      />
                    </FormField>
                  </div>
                )}
              </div>

              {/* Coluna 2 — imagens */}
              <div className="flex flex-col gap-4">
                <SectionTitle>Imagens</SectionTitle>

                <FormField label="Foto principal" required>
                  <ImageUploader
                    value={formData.imageUrl}
                    onChange={(url) => setFormData((f) => ({ ...f, imageUrl: url }))}
                  />
                </FormField>

                <FormField label="Fotos adicionais" optional>
                  <MultiImageUploader
                    images={formData.images}
                    onChange={(imgs) => setFormData((f) => ({ ...f, images: imgs }))}
                  />
                </FormField>
              </div>
            </div>

            {/* Bloco inferior: detalhes (largura total) */}
            <div className="flex flex-col gap-6 border-t border-gray-100 pt-6">
              <SectionTitle>Detalhes</SectionTitle>

              <FormField label="Descrição" optional>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Descrição do produto..."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </FormField>

              {/* Características e variantes lado a lado no desktop */}
              <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
                <FormField label="Características" optional>
                  <CharacteristicsEditor
                    items={formData.characteristics}
                    onChange={(items) => setFormData((f) => ({ ...f, characteristics: items }))}
                  />
                </FormField>

                <FormField label="Variantes" optional>
                  <VariantsEditor
                    variants={formData.variants}
                    onChange={(v) => setFormData((f) => ({ ...f, variants: v }))}
                    basePrice={formData.price}
                  />
                </FormField>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de confirmação de exclusão */}
      {deletingProduct && (
        <Modal title="Excluir produto" onClose={() => setDeletingProduct(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Tem certeza que deseja excluir{' '}
              <span className="font-semibold text-gray-900">
                {deletingProduct.brand ? `${deletingProduct.brand} ` : ''}{deletingProduct.name}
              </span>
              ? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingProduct(null)}
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

// Upload de múltiplas fotos — grade de miniaturas com botão de adicionar
function MultiImageUploader({
  images,
  onChange,
}: {
  images: string[]
  onChange: (images: string[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const newImages: string[] = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      try {
        newImages.push(await compressImage(file))
      } catch {
        const reader = new FileReader()
        await new Promise<void>((resolve) => {
          reader.onload = () => { newImages.push(reader.result as string); resolve() }
          reader.readAsDataURL(file)
        })
      }
    }
    onChange([...images, ...newImages].slice(0, 10))
    if (inputRef.current) inputRef.current.value = ''
  }

  function removeImage(index: number) {
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-2">
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      <div className="flex flex-wrap gap-2">
        {images.map((img, index) => (
          <div key={index} className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200">
            <img src={img} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {images.length < 10 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-600"
          >
            <Plus size={20} />
          </button>
        )}
      </div>
      {images.length > 0 && (
        <p className="text-xs text-gray-400">{images.length}/10 fotos</p>
      )}
    </div>
  )
}

// Editor de características do produto — pares nome/valor com adicionar e remover
function CharacteristicsEditor({
  items,
  onChange,
}: {
  items: ProductCharacteristic[]
  onChange: (items: ProductCharacteristic[]) => void
}) {
  function addItem() {
    onChange([...items, { name: '', value: '' }])
  }

  function updateItem(index: number, field: 'name' | 'value', val: string) {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: val } : item,
    )
    onChange(updated)
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-2">
          <input
            type="text"
            value={item.name}
            onChange={(e) => updateItem(index, 'name', e.target.value)}
            placeholder="Ex: Armazenamento"
            className={`flex-1 ${inputClass}`}
          />
          <input
            type="text"
            value={item.value}
            onChange={(e) => updateItem(index, 'value', e.target.value)}
            placeholder="Ex: 256 GB"
            className={`flex-1 ${inputClass}`}
          />
          <button
            type="button"
            onClick={() => removeItem(index)}
            className="mt-2 shrink-0 text-gray-400 hover:text-red-500"
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-1.5 self-start rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
      >
        <Plus size={14} />
        Adicionar característica
      </button>
    </div>
  )
}

// Seletor de categorias em árvore com checkboxes para o formulário de produto
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
      if (next.has(id)) next.delete(id)
      else next.add(id)
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
        const isSelected = selectedIds.includes(cat.id)

        return (
          <div key={cat.id} className={level > 0 ? 'ml-4 border-l border-gray-100 pl-2' : ''}>
            <div className="flex items-center gap-1 rounded-lg px-1 py-1 hover:bg-gray-50">
              <button
                type="button"
                onClick={() => toggleExpand(cat.id)}
                className={`flex h-4 w-4 shrink-0 items-center justify-center text-gray-400 hover:text-gray-600 ${!hasChildren ? 'invisible' : ''}`}
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={isSelected}
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

const inputClass =
  'w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900'

function FormField({
  label,
  optional = false,
  required = false,
  children,
}: {
  label: string
  optional?: boolean
  // Campo obrigatório — mostra um asterisco vermelho ao lado do rótulo
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500" aria-label="obrigatório">*</span>}
        {optional && <span className="text-xs font-normal text-gray-400">(opcional)</span>}
      </label>
      {children}
    </div>
  )
}

// Título de seção dentro do formulário — separa grupos de campos relacionados
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
      {children}
    </h3>
  )
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
  // Rodapé fixo (ações) — fica sempre visível mesmo com o corpo rolando
  footer?: React.ReactNode
  // 'md' para diálogos simples (confirmação); 'lg' para formulários grandes
  size?: 'md' | 'lg'
}) {
  const maxWidth = size === 'lg' ? 'max-w-3xl' : 'max-w-md'

  return (
    // Fundo escurecido — clique fora fecha o modal
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`flex max-h-[92vh] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl bg-white shadow-xl`}>

        {/* Cabeçalho do modal (fixo no topo) */}
        <div className="flex shrink-0 items-start justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-bold text-gray-900 sm:text-lg">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-1 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo (rola quando maior que a tela) */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {/* Rodapé fixo com as ações */}
        {footer && (
          <div className="shrink-0 border-t border-gray-100 bg-gray-50/70 px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
