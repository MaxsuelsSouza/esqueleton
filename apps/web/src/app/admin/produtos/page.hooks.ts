'use client'

// Hook que centraliza toda a lógica de estado e dados da página de produtos
import { useState, useEffect, useRef, useCallback } from 'react'
import { catalogService } from '@/modules/catalog/services/catalog.service'
import { categoriesService } from '@/modules/categories/services/categories.service'
import { getMockProducts, setMockProducts } from '@/modules/catalog/mocks/products-store'
import { getMockCategories } from '@/modules/categories/mocks/categories-store'
import { buildCategoryTree } from '@/modules/categories/utils/categories'
import type { Product, ProductListItem, Category } from '@esqueleton/shared'
import { buildDiff } from '@/shared/utils/diff'

// Troque para false quando a API estiver pronta
const USE_MOCK_DATA = false

// Quantidade de produtos por página — a listagem busca uma página por vez no servidor
const PAGE_SIZE = 24

// Dados de uma variante no formulário
export type VariantFormData = {
  // ID da variante já salva — preservá-lo evita que a API recrie as variantes
  // (sacolas de clientes guardam o variantId por dias)
  id?: string
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
  // A listagem é enxuta — cada item tem só id, nome, marca, foto e disponibilidade
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Paginação no servidor
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Controle do modal de criar/editar
  const [modalOpen, setModalOpen] = useState(false)
  // ID do produto em edição (definido na hora); editingProduct guarda o produto
  // COMPLETO após a busca — usado como base do diff ao salvar
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<ProductFormData>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  // Carregando o produto completo ao abrir a edição (a listagem é enxuta)
  const [isEditLoading, setIsEditLoading] = useState(false)

  // Controle da confirmação de exclusão
  const [deletingProduct, setDeletingProduct] = useState<ProductListItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ID do produto sendo alternado entre disponível/indisponível (loading individual)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Filtros da listagem (aplicados no servidor)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [searchFocused, setSearchFocused] = useState(false)

  // Controla se o skeleton de primeiro carregamento já foi exibido — usa ref
  // para não depender do valor de products (que pode voltar a 0 após um filtro vazio)
  const hasLoadedRef = useRef(false)

  // Carrega a lista de categorias uma única vez (para o filtro e o formulário)
  useEffect(() => {
    loadCategories()
  }, [])

  const loadProducts = useCallback(async () => {
    if (USE_MOCK_DATA) {
      const all = getMockProducts()
      setProducts(all)
      setTotal(all.length)
      setTotalPages(1)
      setIsLoading(false)
      hasLoadedRef.current = true
      return
    }

    // Skeleton só no primeiro carregamento — nos seguintes os dados anteriores
    // continuam visíveis enquanto a nova requisição acontece em segundo plano
    if (!hasLoadedRef.current) {
      setIsLoading(true)
    }
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
      hasLoadedRef.current = true
    } catch {
      setError('Não foi possível carregar os produtos.')
    } finally {
      setIsLoading(false)
    }
  }, [page, search, filterCategory, sortBy])

  // Recarrega os produtos sempre que a página ou os filtros mudarem.
  // O pequeno atraso (debounce) evita uma requisição a cada tecla digitada na busca.
  useEffect(() => {
    const timer = setTimeout(() => { loadProducts() }, 300)
    return () => clearTimeout(timer)
  }, [loadProducts])

  // Mudou a busca, a categoria ou a ordenação → volta para a primeira página.
  // Sem isso, uma busca feita na página 3 mostraria "nenhum produto encontrado"
  // mesmo havendo resultados (que estão na página 1).
  useEffect(() => {
    setPage(1)
  }, [search, filterCategory, sortBy])

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

  // Abre o modal para criar um novo produto
  function openCreateModal() {
    setEditingId(null)
    setEditingProduct(null)
    setFormData(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  // Converte um produto (completo) para os dados editáveis do formulário
  function productToForm(product: Product): ProductFormData {
    return {
      brand: product.brand ?? '',
      name: product.name,
      description: product.description ?? '',
      price: String(product.price),
      imageUrl: product.imageUrl ?? '',
      images: product.images ?? [],
      categoryIds: product.categoryIds ?? [],
      characteristics: product.characteristics ?? [],
      variants: (product.variants ?? []).map((v) => ({
        id: v.id,
        options: v.options,
        price: String(v.price),
        imageUrl: v.imageUrl ?? '',
        active: v.active,
      })),
    }
  }

  // Abre o modal para editar. A listagem é enxuta (só nome, marca, foto e status),
  // então buscamos o produto COMPLETO (preço, descrição, variantes, fotos extras,
  // características) apenas agora — evitando carregar tudo de todos na tela principal.
  async function openEditModal(item: ProductListItem) {
    setEditingId(item.id)
    setEditingProduct(null)
    setFormError(null)
    // Preenche já com o que a listagem tem, para o modal não abrir vazio
    setFormData({
      ...EMPTY_FORM,
      brand: item.brand ?? '',
      name: item.name,
      imageUrl: item.imageUrl ?? '',
    })
    setModalOpen(true)

    if (USE_MOCK_DATA) {
      // No modo mock a lista já tem os produtos completos em memória
      const full = getMockProducts().find((p) => p.id === item.id)
      if (full) {
        setEditingProduct(full)
        setFormData(productToForm(full))
      }
      return
    }

    setIsEditLoading(true)
    try {
      const token = localStorage.getItem('admin_token') ?? ''
      const full = await catalogService.getProduct(item.id, token)
      // full passa a ser a base do diff (senão o save reenviaria tudo sempre)
      setEditingProduct(full)
      setFormData(productToForm(full))
    } catch {
      setFormError('Não foi possível carregar os dados do produto. Tente novamente.')
    } finally {
      setIsEditLoading(false)
    }
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      setFormError('O nome do produto é obrigatório.')
      return
    }
    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      setFormError('O preço deve ser maior que zero.')
      return
    }
    if (!formData.imageUrl.trim()) {
      setFormError('A foto principal é obrigatória.')
      return
    }

    setIsSaving(true)
    setFormError(null)

    const preco = Number(formData.price)
    // Filtra características com nome e valor preenchidos
    const characteristicsLimpos = formData.characteristics.filter(
      (c) => c.name.trim() && c.value.trim(),
    ).map((c) => ({ name: c.name.trim(), value: c.value.trim() }))

    // Filtra variantes com pelo menos um atributo válido e preço válido.
    // Mantém o id das variantes existentes para a API atualizar no lugar em vez de recriar.
    const variantsLimpos = formData.variants
      .map((v) => ({
        id: v.id,
        // Descarta atributos sem nome ou sem valor (ex: a linha vazia inicial),
        // para nunca enviar { "": "" } à API
        options: Object.fromEntries(
          Object.entries(v.options)
            .filter(([nome, valor]) => nome.trim() && valor.trim())
            .map(([nome, valor]) => [nome.trim(), valor.trim()]),
        ),
        price: v.price,
        imageUrl: v.imageUrl.trim() || null,
        active: v.active,
      }))
      .filter((v) => Object.keys(v.options).length > 0 && v.price && !isNaN(Number(v.price)))
      .map((v) => ({ ...v, price: Number(v.price) }))

    // Campos opcionais vazios vão como null — é o que faz a API LIMPAR o valor
    // no banco (undefined seria descartado do JSON e o valor antigo voltaria)
    const payload = {
      brand: formData.brand.trim() || null,
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
      if (editingId) {
        setMockProducts(getMockProducts().map((p) =>
          p.id === editingId ? { ...p, ...payload, updatedAt: new Date().toISOString() } as Product : p,
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
      if (editingId) {
        // Com o produto completo carregado, envia só o que mudou (diff). Se por algum
        // motivo ele não carregou, envia o payload inteiro como atualização.
        if (editingProduct) {
          // Normaliza as variantes do produto original para o MESMO formato do payload —
          // sem isso o diff sempre acusaria mudança (a resposta da API tem campos extras)
          // e toda edição reenviaria as variantes desnecessariamente
          const originalForDiff = {
            ...(editingProduct as unknown as Record<string, unknown>),
            variants: (editingProduct.variants ?? []).map((v) => ({
              id: v.id,
              options: v.options,
              price: v.price,
              imageUrl: v.imageUrl ?? null,
              active: v.active,
            })),
            characteristics: editingProduct.characteristics ?? [],
          }
          const diff = buildDiff(originalForDiff, payload)
          if (Object.keys(diff).length === 0) { setIsSaving(false); setModalOpen(false); return }
          await catalogService.updateProduct(editingId, diff as Partial<Product>, token)
        } else {
          await catalogService.updateProduct(editingId, payload as unknown as Partial<Product>, token)
        }
      } else {
        await catalogService.createProduct(payload as unknown as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, token)
      }
      setModalOpen(false)
      loadProducts()
    } catch (err: unknown) {
      // Mostra a mensagem real da API quando existir — ex: limite de produtos do plano
      setFormError((err as Error)?.message || 'Erro ao salvar o produto. Tente novamente.')
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
      // Mantém o modal aberto e avisa — fechar sem mensagem faria o lojista
      // acreditar que o produto foi excluído
      setError('Não foi possível excluir o produto. Tente novamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Alterna a disponibilidade do produto (visível/oculto no catálogo público)
  async function handleToggleAvailability(product: ProductListItem) {
    const token = localStorage.getItem('admin_token') ?? ''
    setTogglingId(product.id)
    try {
      await catalogService.updateProduct(product.id, { isAvailable: !product.isAvailable }, token)
      // Atualiza localmente sem recarregar a página inteira
      setProducts((prev) =>
        prev.map((p) => p.id === product.id ? { ...p, isAvailable: !product.isAvailable } : p),
      )
    } catch {
      setError('Erro ao alterar a disponibilidade do produto.')
    } finally {
      setTogglingId(null)
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
    editingId,
    formData,
    setFormData,
    isSaving,
    formError,
    openCreateModal,
    openEditModal,
    isEditLoading,
    handleSave,

    // Modal de exclusão
    deletingProduct,
    setDeletingProduct,
    isDeleting,
    handleDelete,

    // Toggle de disponibilidade
    togglingId,
    handleToggleAvailability,
  }
}
