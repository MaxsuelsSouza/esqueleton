'use client'

// Página principal — exibe o catálogo completo de produtos da loja
import { useState, useEffect, useMemo } from 'react'
import { CatalogToolbar } from '@/components/catalog/CatalogToolbar'
import { FeaturedSection } from '@/components/catalog/FeaturedSection'
import { ProductCard } from '@/components/catalog/ProductCard'
import { catalogService } from '@/services/catalog.service'
import { categoriesService } from '@/services/categories.service'
import { promotionsService } from '@/services/promotions.service'
import { featuredService } from '@/services/featured.service'
import { expandSelectedCategories } from '@/utils/categories'
import { applyPromotionsToProducts } from '@/utils/promotions'
import { getActiveFeatured } from '@/utils/featured'
import type { Product, Category, Promotion, Featured, CatalogFilters, DisplayMode } from '@esqueleton/shared'
import { PackageSearch, ChevronLeft, ChevronRight } from 'lucide-react'

// Estado inicial dos filtros — nenhum filtro aplicado
const DEFAULT_FILTERS: CatalogFilters = {
  searchTerm: '',
  categories: [],
  priceMin: null,
  priceMax: null,
  sortBy: 'newest',
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(1)

  const [categories, setCategories] = useState<Category[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [featuredSections, setFeaturedSections] = useState<Featured[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_FILTERS)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid')

  // Carrega categorias, promoções e destaques uma única vez
  useEffect(() => {
    Promise.all([
      categoriesService.listCategories(),
      promotionsService.listPromotions(),
      featuredService.listFeatured(),
    ]).then(([cats, promos, featured]) => {
      setCategories(cats)
      setPromotions(promos)
      setFeaturedSections(featured)
    }).catch(() => {})
  }, [])

  // Busca produtos sempre que filtros ou página mudarem
  useEffect(() => {
    setIsLoading(true)
    setError(null)

    // Expande categorias selecionadas para incluir subcategorias antes de enviar para a API
    const expandedIds =
      filters.categories.length > 0
        ? [...expandSelectedCategories(filters.categories, categories)]
        : undefined

    catalogService.listProducts({
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
  }, [filters, page, categories])

  // Determina qual seção em destaque exibir
  const activeFeatured = useMemo(() => getActiveFeatured(featuredSections), [featuredSections])

  // Busca os produtos da seção em destaque por IDs — separado da listagem paginada
  useEffect(() => {
    if (!activeFeatured || activeFeatured.productIds.length === 0) {
      setFeaturedProducts([])
      return
    }
    catalogService.getProductsByIds(activeFeatured.productIds)
      .then((result) => setFeaturedProducts(result.data))
      .catch(() => setFeaturedProducts([]))
  }, [activeFeatured])

  // Aplica promoções nos produtos da página atual
  const promotedProducts = useMemo(
    () => applyPromotionsToProducts(products, promotions),
    [products, promotions],
  )

  // Aplica promoções nos produtos em destaque
  const promotedFeatured = useMemo(
    () => applyPromotionsToProducts(featuredProducts, promotions).map((p) => p.product),
    [featuredProducts, promotions],
  )

  function handleToolbarChange(newFilters: CatalogFilters, newDisplayMode: DisplayMode) {
    setFilters(newFilters)
    setDisplayMode(newDisplayMode)
    // Volta para a primeira página ao mudar qualquer filtro
    setPage(1)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    // Sobe para o topo da listagem ao trocar de página
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const hasActiveFilters =
    filters.searchTerm !== '' ||
    filters.categories.length > 0 ||
    filters.priceMin !== null ||
    filters.priceMax !== null ||
    filters.sortBy !== 'newest'

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-8">

        {/* Barra de busca, filtros e alternador de exibição */}
        <div className="mb-4">
          <CatalogToolbar categories={categories} onChange={handleToolbarChange} />
        </div>

        {/* Seção em destaque — oculta quando qualquer filtro estiver ativo */}
        {!isLoading && activeFeatured && !hasActiveFilters && (
          <FeaturedSection
            products={promotedFeatured}
            title={activeFeatured.title}
            tag={activeFeatured.tag}
          />
        )}

        {/* Título e contagem */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Catálogo</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isLoading
              ? 'Carregando produtos...'
              : `${total} produto${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Esqueleto de carregamento */}
        {isLoading && <ProductSkeleton displayMode={displayMode} />}

        {/* Lista de produtos */}
        {!isLoading && !error && promotedProducts.length > 0 && (
          <ProductGrid items={promotedProducts} displayMode={displayMode} />
        )}

        {/* Nenhum produto encontrado */}
        {!isLoading && !error && promotedProducts.length === 0 && (
          <EmptyState hasFilters={hasActiveFilters} />
        )}

        {/* Paginação */}
        {!isLoading && totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={handlePageChange}
          />
        )}

      </div>
    </main>
  )
}

// ── Paginação ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onChange }: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  // Gera os números de página visíveis — sempre mostra primeira, última e até 3 ao redor da atual
  function getPages(): (number | '...')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)

    const pages: (number | '...')[] = [1]

    if (page > 3) pages.push('...')

    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i)
    }

    if (page < totalPages - 2) pages.push('...')

    pages.push(totalPages)
    return pages
  }

  return (
    <div className="mt-8 flex items-center justify-center gap-1">

      {/* Anterior */}
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Números */}
      {getPages().map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="flex h-9 w-9 items-center justify-center text-sm text-gray-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={
              p === page
                ? 'flex h-9 w-9 items-center justify-center rounded-xl text-sm font-medium transition-colors'
                : 'flex h-9 w-9 items-center justify-center rounded-xl text-sm font-medium transition-colors border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900'
            }
            style={p === page ? { backgroundColor: 'var(--color-primary, #111827)', color: '#ffffff' } : undefined}
          >
            {p}
          </button>
        )
      )}

      {/* Próxima */}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

// ── Grade / lista ───────────────────────────────────────────────────────────

function ProductGrid({
  items,
  displayMode,
}: {
  items: { product: Product; badge?: string; badgeColor?: string; promotionId?: string; promotionName?: string }[]
  displayMode: DisplayMode
}) {
  if (displayMode === 'list') {
    return (
      <div className="flex flex-col gap-3">
        {items.map(({ product, badge, badgeColor, promotionId, promotionName }) => (
          <ProductCard key={product.id} product={product} badge={badge} badgeColor={badgeColor} promotionId={promotionId} promotionName={promotionName} displayMode="list" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {items.map(({ product, badge, badgeColor, promotionId, promotionName }) => (
        <ProductCard key={product.id} product={product} badge={badge} badgeColor={badgeColor} promotionId={promotionId} promotionName={promotionName} displayMode="grid" />
      ))}
    </div>
  )
}

// ── Esqueleto ───────────────────────────────────────────────────────────────

function ProductSkeleton({ displayMode }: { displayMode: DisplayMode }) {
  const items = Array.from({ length: 8 })

  if (displayMode === 'list') {
    return (
      <div className="flex flex-col gap-3">
        {items.map((_, i) => (
          <div key={i} className="flex gap-4 rounded-xl border border-gray-100 bg-white p-4">
            <div className="h-28 w-28 shrink-0 animate-pulse rounded-lg bg-gray-200" />
            <div className="flex flex-1 flex-col gap-2 py-1">
              <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
              <div className="mt-auto h-5 w-1/4 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {items.map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-100 bg-white">
          <div className="aspect-square animate-pulse rounded-t-2xl bg-gray-200" />
          <div className="flex flex-col gap-2 p-3 sm:p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
            <div className="mt-1 h-8 w-full animate-pulse rounded-xl bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Estado vazio ────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-gray-400">
      <PackageSearch size={48} strokeWidth={1.5} />
      <p className="text-lg font-medium">Nenhum produto encontrado</p>
      <p className="text-sm">
        {hasFilters
          ? 'Tente ajustar os filtros para ver mais resultados.'
          : 'Ainda não há produtos cadastrados no catálogo.'}
      </p>
    </div>
  )
}
