'use client'

// Hook que centraliza toda a lógica de estado e dados da página de produtos
import { useState, useEffect } from 'react'
import { catalogService } from '@/modules/catalog/services/catalog.service'
import { categoriesService } from '@/modules/categories/services/categories.service'
import { getMockProducts, setMockProducts } from '@/modules/catalog/mocks/products-store'
import { getMockCategories } from '@/modules/categories/mocks/categories-store'
import { buildCategoryTree } from '@/modules/categories/utils/categories'
import type { Product, Category } from '@esqueleton/shared'

// Troque para false quando a API estiver pronta
const USE_MOCK_DATA = false

// Quantidade de produtos por página — a listagem busca uma página por vez no servidor
const PAGE_SIZE = 24

// Dados de uma variante no formulário
export type VariantFormData = {
  options: Record<string, string>
  price: string
  imageUrl: string
  active: boolean
}

export const EMPTY_VARIANT: VariantFormData = {
  options: {},
  price: '',
  imageUrl: '',
  active: true,
}

// Campos editáveis de um produto (sem id e datas que são gerados pela API)
export type ProductFormData = {
  brand: string
  name: string
  description: string
  price: string
  imageUrl: string
  images: string[]
  categoryIds: string[]
  characteristics: { name: string; value: string }[]
  variants: VariantFormData[]
}

const EMPTY_FORM: ProductFormData = {
  brand: '',
  name: '',
  description: '',
  price: '',
  imageUrl: '',
  images: [],
  categoryIds: [],
  characteristics: [],
  variants: [],
}

export function useProdutosPage() {
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
      const cats = await categoriesService.listCategories(localStorage.getItem('admin_token') ?? '')
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
      }, localStorage.getItem('admin_token') ?? '')
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
      price: String(product.price),
      imageUrl: product.imageUrl ?? '',
      images: product.images ?? [],
      categoryIds: product.categoryIds ?? [],
      characteristics: product.characteristics ?? [],
      variants: (product.variants ?? []).map((v) => ({
        options: v.options,
        price: String(v.price),
        imageUrl: v.imageUrl ?? '',
        active: v.active,
      })),
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      setFormError('O nome do produto é obrigatório.')
      return
    }
    if (!formData.price || isNaN(Number(formData.price))) {
      setFormError('Informe um preço válido.')
      return
    }

    setIsSaving(true)
    setFormError(null)

    const preco = Number(formData.price)
    // Filtra características com nome e valor preenchidos
    const characteristicsLimpos = formData.characteristics.filter(
      (c) => c.name.trim() && c.value.trim(),
    ).map((c) => ({ name: c.name.trim(), value: c.value.trim() }))

    // Filtra variantes com pelo menos uma opção e preço válido
    const variantsLimpos = formData.variants
      .filter((v) => Object.keys(v.options).length > 0 && v.price && !isNaN(Number(v.price)))
      .map((v) => ({
        options: v.options,
        price: Number(v.price),
        imageUrl: v.imageUrl.trim() || undefined,
        active: v.active,
      }))

    const payload = {
      brand: formData.brand.trim() || undefined,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      price: preco,
      imageUrl: formData.imageUrl.trim() || null,
      images: formData.images.filter(Boolean),
      categoryIds: formData.categoryIds,
      characteristics: characteristicsLimpos,
      variants: variantsLimpos,
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

  // A busca, a categoria e a ordenação são aplicadas no servidor
  const pageProducts = products

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

  return {
    // Estado da listagem
    products,
    categories,
    isLoading,
    error,
    page,
    setPage,
    total,
    totalPages,

    // Filtros
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

    // Modal de criar/editar
    modalOpen,
    setModalOpen,
    editingProduct,
    formData,
    setFormData,
    isSaving,
    formError,
    openCreateModal,
    openEditModal,
    handleSave,

    // Modal de exclusão
    deletingProduct,
    setDeletingProduct,
    isDeleting,
    handleDelete,
  }
}
