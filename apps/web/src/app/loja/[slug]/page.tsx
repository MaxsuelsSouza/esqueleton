'use client'

// Página principal da loja — exibe o catálogo completo de produtos
// O slug na URL (/loja/[slug]) identifica qual loja está sendo visitada
import { CatalogSearch } from '@/modules/catalog/components/CatalogSearch'
import { CatalogFilters } from '@/modules/catalog/components/CatalogFilters'
import { DisplayToggle } from '@/modules/catalog/components/DisplayToggle'
import { FeaturedSection } from '@/modules/featured/components/FeaturedSection'
import { StoreBanner } from '@/modules/store-profile'
import { ProductCard } from '@/modules/catalog/components/ProductCard'
import type { Product, DisplayMode, PromotionType } from '@esqueleton/shared'
import { PackageSearch, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCatalogoPage } from './page.hooks'

export default function CatalogPage() {
  const {
    filters,
    categories,
    displayMode,
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
  } = useCatalogoPage()

  return (
    <main className="min-h-screen bg-gray-50">

      {/* ── Banner da loja — abaixo do header até metade da tela ───────────── */}
      <StoreBanner />

      {/* ── Barra superior mobile ─────────────────────────────────────────────
          Visível apenas abaixo de lg. Contém busca + alternador de exibição.
          A navegação por categorias e promoções fica no menu lateral do header. */}
      <div className="border-b border-gray-100 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <CatalogSearch value={filters.searchTerm} onChange={handleSearchChange} />
          <DisplayToggle current={displayMode} onChange={handleDisplayChange} />
        </div>
      </div>

      {/* ── Área principal ────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="lg:flex lg:items-start lg:gap-8">

          {/* ── Sidebar de filtros — somente desktop ──────────────────────── */}
          <aside className="hidden w-52 shrink-0 lg:block xl:w-60">
            <div className="sticky top-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Filtros</h2>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-700"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <CatalogFilters
                filters={filters}
                categories={categories}
                onFiltersChange={handleFiltersChange}
                direction="vertical"
              />
            </div>
          </aside>

          {/* ── Conteúdo do catálogo ──────────────────────────────────────── */}
          <div className="min-w-0 flex-1">

            {/* Busca + alternador de exibição — somente desktop */}
            <div className="mb-6 hidden items-center gap-3 lg:flex">
              <CatalogSearch value={filters.searchTerm} onChange={handleSearchChange} />
              <DisplayToggle current={displayMode} onChange={handleDisplayChange} />
            </div>

            {/* Seção em destaque — visível apenas na primeira página e sem filtros ativos */}
            {!isLoading && activeFeatured && !hasActiveFilters && page === 1 && (
              <FeaturedSection
                products={promotedFeatured}
                title={activeFeatured.title}
                tag={activeFeatured.tag}
                featuredId={activeFeatured.id}
                featuredName={activeFeatured.title}
                carousel={activeFeatured.carousel}
              />
            )}

            {/* Título e contagem */}
            <div className="mb-4">
              <h1 className="text-xl font-bold text-gray-900">Catálogo</h1>
              <p className="mt-0.5 text-sm text-gray-500">
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

            {/* Paginação — exibe sempre que houver produtos, mesmo em página única */}
            {!isLoading && totalPages >= 1 && promotedProducts.length > 0 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={handlePageChange}
              />
            )}

          </div>
        </div>
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
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
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
                : 'flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900'
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
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

// ── Grade / lista ───────────────────────────────────────────────────────────

type PromotedItem = {
  product: Product
  badge?: string
  badgeColor?: string
  promotionId?: string
  promotionName?: string
  originalPrice?: number
  discountPercent?: number
  promotionDescription?: string
  promotionType?: PromotionType
  promotionProductIds?: string[]
  buyQuantity?: number
  getQuantity?: number
  kitPrice?: number
}

function ProductGrid({ items, displayMode }: { items: PromotedItem[]; displayMode: DisplayMode }) {
  if (displayMode === 'list') {
    return (
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <ProductCard key={item.product.id} {...item} displayMode="list" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <ProductCard key={item.product.id} {...item} displayMode="grid" />
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
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
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
