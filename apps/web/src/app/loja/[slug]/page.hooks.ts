'use client'

// Hook que concentra toda a lógica de estado e dados da página de catálogo
// Nenhuma dependência de JSX — apenas estado, efeitos e callbacks

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useStoreSlug } from '@/shared/hooks/useStoreSlug'
import { catalogService } from '@/modules/catalog/services/catalog.service'
import { categoriesService } from '@/modules/categories/services/categories.service'
import { promotionsService } from '@/modules/promotions/services/promotions.service'
import { featuredService } from '@/modules/featured/services/featured.service'
import { expandSelectedCategories, buildCategoryTree } from '@/modules/categories/utils/categories'
import { applyPromotionsToProducts } from '@/modules/promotions/utils/promotions'
import { getActiveFeatured } from '@/modules/featured/utils/featured'
import type { Product, Category, Promotion, Featured, CatalogFilters as CatalogFiltersType, DisplayMode } from '@esqueleton/shared'

// Estado inicial dos filtros — nenhum filtro aplicado
const DEFAULT_FILTERS: CatalogFiltersType = {
  searchTerm: '',
  categories: [],
  priceMin: null,
  priceMax: null,
  sortBy: 'newest',
}

export function useCatalogoPage() {
  const slug = useStoreSlug()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  // Lê a página inicial da URL (?page=N), com fallback para 1
  const [page, setPage] = useState(() => {
    const p = Number(searchParams.get('page'))
    return p > 0 ? p : 1
  })

  const [categories, setCategories] = useState<Category[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [featuredSections, setFeaturedSections] = useState<Featured[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<CatalogFiltersType>(DEFAULT_FILTERS)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid')
  // Controla se o painel de filtros está aberto no mobile
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Carrega categorias, promoções e destaques da loja uma única vez
  useEffect(() => {
    Promise.all([
      categoriesService.listPublicCategories(slug),
      promotionsService.listPublicPromotions(slug),
      featuredService.listPublicFeatured(slug),
    ]).then(([cats, promos, featured]) => {
      setCategories(buildCategoryTree(cats))
      setPromotions(promos)
      setFeaturedSections(featured)
    }).catch(() => {})
  }, [slug])

  // Busca produtos sempre que filtros ou página mudarem
  useEffect(() => {
    setIsLoading(true)
    setError(null)

    // Expande categorias selecionadas para incluir subcategorias antes de enviar para a API
    const expandedIds =
      filters.categories.length > 0
        ? [...expandSelectedCategories(filters.categories, categories)]
        : undefined

    catalogService.listPublicProducts(slug, {
      page,
      search: filters.searchTerm || undefined,
      categoryIds: expandedIds?.join(','),
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      sortBy: filters.sortBy,
    })
      .then((result) => {
        setProducts(result.data)
        setTotal(result.total)
        setTotalPages(result.totalPages)
      })
      .catch(() => setError('Não foi possível carregar os produtos. Tente novamente.'))
      .finally(() => setIsLoading(false))
  }, [slug, filters, page, categories])

  // Determina qual seção em destaque exibir
  const activeFeatured = useMemo(() => getActiveFeatured(featuredSections), [featuredSections])

  // Busca os produtos da seção em destaque por IDs — separado da listagem paginada
  useEffect(() => {
    if (!activeFeatured || activeFeatured.productIds.length === 0) {
      setFeaturedProducts([])
      return
    }
    catalogService.getPublicProductsByIds(slug, activeFeatured.productIds)
      .then((result) => setFeaturedProducts(result.data))
      .catch(() => setFeaturedProducts([]))
  }, [slug, activeFeatured])

  // Aplica promoções nos produtos da página atual
  const promotedProducts = useMemo(
    () => applyPromotionsToProducts(products, promotions),
    [products, promotions],
  )

  // Aplica promoções nos produtos em destaque (mantém metadados de badge/desconto)
  const promotedFeatured = useMemo(
    () => applyPromotionsToProducts(featuredProducts, promotions),
    [featuredProducts, promotions],
  )

  function handleFiltersChange(newFilters: CatalogFiltersType) {
    setFilters(newFilters)
    setPage(1)
  }

  function handleSearchChange(searchTerm: string) {
    handleFiltersChange({ ...filters, searchTerm })
  }

  function handleDisplayChange(mode: DisplayMode) {
    setDisplayMode(mode)
  }

  // Remove todos os filtros exceto o texto de busca
  function clearFilters() {
    handleFiltersChange({ ...DEFAULT_FILTERS, searchTerm: filters.searchTerm })
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    // Atualiza a URL com o parâmetro ?page=N para que o link seja compartilhável
    const params = new URLSearchParams(searchParams.toString())
    if (newPage > 1) {
      params.set('page', String(newPage))
    } else {
      params.delete('page')
    }
    const query = params.toString()
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
    // Sobe para o topo da listagem ao trocar de página
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const hasActiveFilters =
    filters.searchTerm !== '' ||
    filters.categories.length > 0 ||
    filters.priceMin !== null ||
    filters.priceMax !== null ||
    filters.sortBy !== 'newest'

  // Conta apenas filtros "manuais" — não inclui a busca, pois já tem o botão X no campo
  const activeFilterCount =
    filters.categories.length +
    (filters.priceMin !== null ? 1 : 0) +
    (filters.priceMax !== null ? 1 : 0) +
    (filters.sortBy !== 'newest' ? 1 : 0)

  return {
    filters,
    categories,
    displayMode,
    filtersOpen,
    setFiltersOpen,
    isLoading,
    error,
    total,
    totalPages,
    page,
    activeFeatured,
    promotedProducts,
    promotedFeatured,
    hasActiveFilters,
    activeFilterCount,
    handleFiltersChange,
    handleSearchChange,
    handleDisplayChange,
    clearFilters,
    handlePageChange,
  }
}
