'use client'

// Página de gestão de produtos — listagem com ações de criar, editar e excluir
import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, X, PackageSearch, ImagePlus, Camera, ChevronLeft, ChevronRight, ChevronDown, Search } from 'lucide-react'
import { catalogService } from '@/services/catalog.service'
import { categoriesService } from '@/services/categories.service'
import { getMockProducts, setMockProducts } from '@/mocks/products-store'
import { getMockCategories } from '@/mocks/categories-store'
import { buildCategoryTree } from '@/utils/categories'
import { compressImage } from '@/utils/image'
import type { Product, Category } from '@esqueleton/shared'

// Troque para false quando a API estiver pronta
const USE_MOCK_DATA = false

// Quantidade de produtos por página — a listagem busca uma página por vez no servidor
const PAGE_SIZE = 24

// Campos editáveis de um produto (sem id e datas que são gerados pela API)
type ProductFormData = {
  brand: string
  name: string
  description: string
  price: string
  originalPrice: string
  stock: string
  imageUrl: string
  categoryIds: string[]
}

const EMPTY_FORM: ProductFormData = {
  brand: '',
  name: '',
  description: '',
  price: '',
  originalPrice: '',
  stock: '',
  imageUrl: '',
  categoryIds: [],
}

export default function AdminProdutosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Paginação no servidor
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Controle do modal de criar/editar
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<ProductFormData>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Controle da confirmação de exclusão
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filtros da listagem (aplicados client-side)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [searchFocused, setSearchFocused] = useState(false)

  // Carrega a lista de categorias uma única vez (para o filtro e o formulário)
  useEffect(() => {
    loadCategories()
  }, [])

  // Recarrega os produtos sempre que a página ou os filtros mudarem.
  // O pequeno atraso (debounce) evita uma requisição a cada tecla digitada na busca.
  useEffect(() => {
    const timer = setTimeout(() => { loadProducts() }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, filterCategory, sortBy])

  async function loadCategories() {
    if (USE_MOCK_DATA) {
      setCategories(buildCategoryTree(getMockCategories()))
      return
    }
    try {
      const cats = await categoriesService.listCategories()
      // A API retorna lista plana — monta a árvore para exibir os checkboxes corretamente
      setCategories(buildCategoryTree(cats))
    } catch {
      // Sem categorias o filtro apenas não aparece — não bloqueia a página
    }
  }

  async function loadProducts() {
    if (USE_MOCK_DATA) {
      const all = getMockProducts()
      setProducts(all)
      setTotal(all.length)
      setTotalPages(1)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      // Paginação no servidor — carrega apenas a página atual, não todos os produtos de uma vez
      const result = await catalogService.listProducts({
        page,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined,
        categoryIds: filterCategory || undefined,
        sortBy,
      })
      setProducts(result.data)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch {
      setError('Não foi possível carregar os produtos.')
    } finally {
      setIsLoading(false)
    }
  }

  // Abre o modal para criar um novo produto
  function openCreateModal() {
    setEditingProduct(null)
    setFormData(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  // Abre o modal preenchido com os dados do produto para edição
  function openEditModal(product: Product) {
    setEditingProduct(product)
    setFormData({
      brand: product.brand ?? '',
      name: product.name,
      description: product.description ?? '',
      price: '',
      // Ao editar, mostra o preço de venda atual no campo "Preço"
      originalPrice: String(product.price),
      stock: product.stock != null ? String(product.stock) : '',
      imageUrl: product.imageUrl ?? '',
      categoryIds: product.categoryIds ?? [],
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      setFormError('O nome do produto é obrigatório.')
      return
    }
    if (!formData.originalPrice || isNaN(Number(formData.originalPrice))) {
      setFormError('Informe um preço válido.')
      return
    }

    setIsSaving(true)
    setFormError(null)

    const preco = Number(formData.originalPrice)
    const payload = {
      brand: formData.brand.trim() || undefined,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      // O campo do formulário "Preço" (originalPrice) é usado como o preço de venda (price).
      // originalPrice não é mais definido pelo formulário — pode ser configurado via promoções.
      price: preco,
      originalPrice: undefined,
      stock: formData.stock !== '' ? Number(formData.stock) : null,
      imageUrl: formData.imageUrl.trim() || null,
      categoryIds: formData.categoryIds,
    }

    if (USE_MOCK_DATA) {
      if (editingProduct) {
        setMockProducts(getMockProducts().map((p) =>
          p.id === editingProduct.id ? { ...p, ...payload, updatedAt: new Date().toISOString() } : p,
        ))
      } else {
        const now = new Date().toISOString()
        setMockProducts([
          ...getMockProducts(),
          { id: `prod-${Date.now()}`, createdAt: now, updatedAt: now, ...payload } as Product,
        ])
      }
      setIsSaving(false)
      setModalOpen(false)
      loadProducts()
      return
    }

    const token = localStorage.getItem('admin_token') ?? ''
    try {
      if (editingProduct) {
        await catalogService.updateProduct(editingProduct.id, payload, token)
      } else {
        await catalogService.createProduct(payload as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, token)
      }
      setModalOpen(false)
      loadProducts()
    } catch {
      setFormError('Erro ao salvar o produto. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingProduct) return
    setIsDeleting(true)

    if (USE_MOCK_DATA) {
      setMockProducts(getMockProducts().filter((p) => p.id !== deletingProduct.id))
      setDeletingProduct(null)
      setIsDeleting(false)
      loadProducts()
      return
    }

    const token = localStorage.getItem('admin_token') ?? ''
    try {
      await catalogService.deleteProduct(deletingProduct.id, token)
      setDeletingProduct(null)
      loadProducts()
    } catch {
      setDeletingProduct(null)
    } finally {
      setIsDeleting(false)
    }
  }

  // A busca, a categoria e a ordenação são aplicadas no servidor.
  // Aqui só reordenamos a página atual para mostrar os produtos esgotados no topo.
  const pageProducts = [...products].sort((a, b) => {
    const aEsgotado = a.stock === 0
    const bEsgotado = b.stock === 0
    if (aEsgotado && !bEsgotado) return -1
    if (!aEsgotado && bEsgotado) return 1
    return 0
  })

  const activeFilterCount =
    (search ? 1 : 0) + (filterCategory ? 1 : 0) + (sortBy !== 'newest' ? 1 : 0)

  function clearFilters() {
    setSearch('')
    setFilterCategory('')
    setSortBy('newest')
    setPage(1)
  }

  // Lista plana de categorias para o select
  function flatCategories(cats: Category[], depth = 0): { id: string; name: string; depth: number }[] {
    return cats.flatMap((c) => [
      { id: c.id, name: c.name, depth },
      ...flatCategories(c.children ?? [], depth + 1),
    ])
  }

  const flatCats = flatCategories(categories)

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

      {/* Barra de filtros */}
      {!isLoading && products.length > 0 && (
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
          <button
            onClick={openCreateModal}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Cadastrar primeiro produto
          </button>
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
                <th className="px-4 py-3">Estoque</th>
                <th className="w-24 px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pageProducts.map((product) => (
                <tr key={product.id} className="transition-colors hover:bg-gray-50">

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
                  </td>

                  {/* Estoque */}
                  <td className="px-4 py-3">
                    {product.stock == null ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : product.stock === 0 ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">Esgotado</span>
                    ) : product.stock <= 5 ? (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">{product.stock} un.</span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">{product.stock} un.</span>
                    )}
                  </td>

                  {/* Botões de ação */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
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
        <Modal title={editingProduct ? 'Editar produto' : 'Novo produto'} onClose={() => setModalOpen(false)}>
          <div className="flex flex-col gap-4">

            <FormField label="Marca" optional>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData((f) => ({ ...f, brand: e.target.value }))}
                placeholder="Ex: Dior"
                className={inputClass}
              />
            </FormField>

            <FormField label="Nome do produto">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Sauvage EDP"
                className={inputClass}
              />
            </FormField>

            <FormField label="Preço (R$)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.originalPrice}
                onChange={(e) => setFormData((f) => ({ ...f, originalPrice: e.target.value }))}
                placeholder="0,00"
                className={inputClass}
              />
            </FormField>

            <FormField label="Estoque" optional>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.stock}
                onChange={(e) => setFormData((f) => ({ ...f, stock: e.target.value }))}
                placeholder="Deixe vazio se não controla estoque"
                className={inputClass}
              />
            </FormField>

            <FormField label="Foto do produto" optional>
              <ImageUploader
                value={formData.imageUrl}
                onChange={(url) => setFormData((f) => ({ ...f, imageUrl: url }))}
              />
            </FormField>

            {categories.length > 0 && (
              <FormField label="Categorias" optional>
                <CategoryCheckboxTree
                  categories={categories}
                  selectedIds={formData.categoryIds}
                  onChange={(ids) => setFormData((f) => ({ ...f, categoryIds: ids }))}
                />
              </FormField>
            )}

            <FormField label="Descrição" optional>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descrição do produto..."
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </FormField>

            {formError && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{formError}</p>
            )}

            <div className="flex gap-3 pt-2">
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

// Área de upload de imagem — suporta clique (galeria/câmera) e arrastar arquivo
function ImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [chooserOpen, setChooserOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  async function readFile(file: File) {
    try {
      // Comprime e redimensiona antes de enviar — mantém o tamanho dentro do limite da API
      onChange(await compressImage(file))
    } catch {
      // Se a compressão falhar, envia o arquivo original como base64
      const reader = new FileReader()
      reader.onload = () => onChange(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) readFile(file)
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    if (galleryInputRef.current) galleryInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    // Só desativa quando o cursor sai da área por completo (não ao passar sobre filhos)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) readFile(file)
  }

  function handleClick() {
    // No desktop abre diretamente a galeria; no mobile mostra a pergunta galeria/câmera
    const isMobile = /Mobi|Android/i.test(navigator.userAgent)
    if (isMobile) {
      setChooserOpen(true)
    } else {
      galleryInputRef.current?.click()
    }
  }

  function pickGallery() {
    setChooserOpen(false)
    galleryInputRef.current?.click()
  }

  function pickCamera() {
    setChooserOpen(false)
    cameraInputRef.current?.click()
  }

  return (
    <>
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

      {/* Área de drop e clique */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex h-32 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-gray-900 bg-gray-100'
            : 'border-gray-200 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
        }`}
      >
        {value ? (
          <>
            <img src={value} alt="Preview" className="h-full w-full object-cover" />
            <button
              onClick={handleRemove}
              aria-label="Remover imagem"
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black"
            >
              <X size={14} />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-black/40 py-1.5 text-center text-xs text-white">
              {isDragging ? 'Solte para trocar' : 'Clique ou arraste para trocar'}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-gray-400">
            <ImagePlus size={24} strokeWidth={1.5} />
            <span className="text-xs font-medium">
              {isDragging ? 'Solte a imagem aqui' : 'Clique ou arraste uma foto'}
            </span>
          </div>
        )}
      </div>

      {/* Pergunta: galeria ou câmera (apenas mobile) */}
      {chooserOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setChooserOpen(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="border-b px-5 py-4 text-sm font-semibold text-gray-700">
              Como deseja adicionar a foto?
            </p>
            <div className="flex flex-col divide-y">
              <button
                onClick={pickGallery}
                className="flex items-center gap-3 px-5 py-4 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <ImagePlus size={18} className="text-gray-400" />
                Escolher da galeria
              </button>
              <button
                onClick={pickCamera}
                className="flex items-center gap-3 px-5 py-4 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Camera size={18} className="text-gray-400" />
                Tirar uma foto
              </button>
              <button
                onClick={() => setChooserOpen(false)}
                className="px-5 py-4 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const inputClass =
  'w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900'

function FormField({
  label,
  optional = false,
  children,
}: {
  label: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
        {label}
        {optional && <span className="text-xs font-normal text-gray-400">(opcional)</span>}
      </label>
      {children}
    </div>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    // Fundo escurecido — clique fora fecha o modal
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">

        {/* Cabeçalho do modal */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
