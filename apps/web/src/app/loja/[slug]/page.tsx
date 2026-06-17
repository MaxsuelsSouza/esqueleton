'use client'

// Página principal da loja — exibe o catálogo completo de produtos.
// O layout é montado dinamicamente a partir da configuração salva pelo admin
// no page builder (/admin/aparencia). Cada componente é posicionado via CSS Grid
// de 12 colunas seguindo as coordenadas definidas no CatalogLayoutItem.
import { CatalogSearch } from '@/modules/catalog/components/CatalogSearch'
import { CatalogSearchCompact } from '@/modules/catalog/components/CatalogSearchCompact'
import { CatalogFilters } from '@/modules/catalog/components/CatalogFilters'
import { DisplayToggle } from '@/modules/catalog/components/DisplayToggle'
import { FeaturedSection } from '@/modules/featured/components/FeaturedSection'
import { ProductCard } from '@/modules/catalog/components/ProductCard'
import { findLayoutItem } from '@/modules/catalog/utils/catalog-layout'
import type { Product, DisplayMode, CatalogLayoutItem, ProductCardStyle } from '@esqueleton/shared'
import { PackageSearch, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { useCatalogoPage } from './page.hooks'

export default function CatalogPage() {
  const {
    layoutItems,
    searchItem,
    productsItem,
    displayToggleItem,
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
  } = useCatalogoPage()

  const hasSearch = !!searchItem
  const hasFilters = !!findLayoutItem(layoutItems, 'filters')
  const hasDisplayToggle = !!displayToggleItem
  const hasFeatured = !!findLayoutItem(layoutItems, 'featured')
  const featuredItem = findLayoutItem(layoutItems, 'featured')
  const gridColumns = (productsItem?.config?.gridColumns ?? 3) as 2 | 3 | 4
  const cardStyle = (productsItem?.config?.cardStyle ?? 'default') as ProductCardStyle

  return (
    <main className="min-h-screen bg-gray-50">

      {/* ── Barra superior mobile ─────────────────────────────────────────────
          Visível apenas abaixo de lg. Contém busca + botão de filtros + alternador. */}
      {(hasSearch || hasFilters || hasDisplayToggle) && (
        <div className="border-b border-gray-100 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            {hasSearch && (
              searchItem?.config?.searchStyle === 'compact'
                ? <CatalogSearchCompact value={filters.searchTerm} onChange={handleSearchChange} />
                : <CatalogSearch value={filters.searchTerm} onChange={handleSearchChange} />
            )}

            {hasFilters && (
              <button
                onClick={() => setFiltersOpen((prev) => !prev)}
                aria-label="Abrir filtros"
                className={`relative flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-sm font-medium transition-colors ${
                  filtersOpen || activeFilterCount > 0
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                <SlidersHorizontal size={15} />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}

            {hasDisplayToggle && (
              <DisplayToggle current={displayMode} onChange={handleDisplayChange} />
            )}
          </div>

          {hasFilters && filtersOpen && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Filtros</span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-700"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <CatalogFilters filters={filters} categories={categories} onFiltersChange={handleFiltersChange} />
            </div>
          )}
        </div>
      )}

      {/* ── Grid principal (desktop) ─────────────────────────────────────── */}
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-8">
        <div
          className="hidden gap-4 lg:grid"
          style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}
        >
          {layoutItems.map((item) => {
            // Componentes que não são renderizados no grid desktop
            if (item.i === 'announcements') return null
            if (item.i === 'products') return null

            return (
              <div
                key={item.i}
                style={{
                  gridColumn: `${item.x + 1} / span ${item.w}`,
                  gridRow: `${item.y + 1} / span ${item.h}`,
                }}
              >
                {renderGridComponent(item)}
              </div>
            )
          })}

          {/* Produtos — sempre renderizado, precisa dos estados de loading/error */}
          {productsItem && (
            <div
              style={{
                gridColumn: `${productsItem.x + 1} / span ${productsItem.w}`,
                gridRow: `${productsItem.y + 1} / span ${productsItem.h}`,
              }}
            >
              {/* Título e contagem */}
              <div className="mb-4">
                <h1 className="text-xl font-bold text-gray-900">Catálogo</h1>
                <p className="mt-0.5 text-sm text-gray-500">
                  {isLoading
                    ? 'Carregando produtos...'
                    : `${total} produto${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
                </p>
              </div>

              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {isLoading && <ProductSkeleton displayMode={displayMode} gridColumns={gridColumns} />}

              {!isLoading && !error && promotedProducts.length > 0 && (
                <ProductGrid items={promotedProducts} displayMode={displayMode} gridColumns={gridColumns} cardStyle={cardStyle} />
              )}

              {!isLoading && !error && promotedProducts.length === 0 && (
                <EmptyState hasFilters={hasActiveFilters} />
              )}

              {!isLoading && totalPages >= 1 && promotedProducts.length > 0 && (
                <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
              )}
            </div>
          )}
        </div>

        {/* Layout mobile (empilhado, sem grid posicional) — já controlado pela barra superior */}
        <div className="lg:hidden">
          {/* Destaque */}
          {hasFeatured && !isLoading && activeFeatured && !hasActiveFilters && page === 1 && (
            <FeaturedSection
              products={promotedFeatured}
              title={activeFeatured.title}
              tag={activeFeatured.tag}
              featuredId={activeFeatured.id}
              featuredName={activeFeatured.title}
              carousel={activeFeatured.carousel}
              variant={featuredItem?.config?.featuredStyle}
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

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {isLoading && <ProductSkeleton displayMode={displayMode} gridColumns={gridColumns} />}

          {!isLoading && !error && promotedProducts.length > 0 && (
            <ProductGrid items={promotedProducts} displayMode={displayMode} gridColumns={gridColumns} cardStyle={cardStyle} />
          )}

          {!isLoading && !error && promotedProducts.length === 0 && (
            <EmptyState hasFilters={hasActiveFilters} />
          )}

          {!isLoading && totalPages >= 1 && promotedProducts.length > 0 && (
            <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
          )}
        </div>
      </div>
    </main>
  )

  // Renderiza um componente do grid baseado no item do layout
  function renderGridComponent(item: CatalogLayoutItem) {
    // Extrai o tipo base do ID (ex: 'text-1' → 'text')
    const type = item.i.replace(/-\d+$/, '')

    switch (type) {
      case 'search':
        if (item.config?.searchStyle === 'compact') {
          return <CatalogSearchCompact value={filters.searchTerm} onChange={handleSearchChange} />
        }
        return <CatalogSearch value={filters.searchTerm} onChange={handleSearchChange} />

      case 'filters':
        return (
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
        )

      case 'display-toggle':
        return (
          <div className="flex h-full items-center">
            <DisplayToggle current={displayMode} onChange={handleDisplayChange} />
          </div>
        )

      case 'featured':
        if (isLoading || !activeFeatured || hasActiveFilters || page !== 1) return null
        return (
          <FeaturedSection
            products={promotedFeatured}
            title={activeFeatured.title}
            tag={activeFeatured.tag}
            featuredId={activeFeatured.id}
            featuredName={activeFeatured.title}
            carousel={activeFeatured.carousel}
            variant={item.config?.featuredStyle}
          />
        )

      case 'text':
        return <TextBlock content={item.config?.textContent} style={item.config?.textStyle} />

      default:
        return null
    }
  }
}

// ── Bloco de texto ─────────────────────────────────────────────────────────

function TextBlock({ content, style = 'normal' }: { content?: string; style?: string }) {
  if (!content) return null

  switch (style) {
    case 'heading':
      return <h2 className="text-xl font-bold text-gray-900">{content}</h2>
    case 'highlight':
      return (
        <div
          className="rounded-xl px-4 py-3 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--color-primary, #000000)' }}
        >
          {content}
        </div>
      )
    case 'banner':
      return (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-medium text-gray-700">
          {content}
        </div>
      )
    default:
      return <p className="text-sm text-gray-600">{content}</p>
  }
}

// ── Paginação ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onChange }: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
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
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronLeft size={16} />
      </button>

      {getPages().map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="flex h-9 w-9 items-center justify-center text-sm text-gray-400">…</span>
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
        ),
      )}

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

// Mapeamento de colunas desktop para classes Tailwind
const GRID_COLS_CLASS: Record<2 | 3 | 4, string> = {
  2: 'grid grid-cols-2 gap-3 sm:gap-4',
  3: 'grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3',
  4: 'grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4',
}

function ProductGrid({
  items,
  displayMode,
  gridColumns = 3,
  cardStyle = 'default',
}: {
  items: { product: Product; badge?: string; badgeColor?: string; promotionId?: string; promotionName?: string; originalPrice?: number; discountPercent?: number }[]
  displayMode: DisplayMode
  gridColumns?: 2 | 3 | 4
  cardStyle?: ProductCardStyle
}) {
  if (displayMode === 'list') {
    return (
      <div className="flex flex-col gap-3">
        {items.map(({ product, badge, badgeColor, promotionId, promotionName, originalPrice, discountPercent }) => (
          <ProductCard key={product.id} product={product} badge={badge} badgeColor={badgeColor} promotionId={promotionId} promotionName={promotionName} originalPrice={originalPrice} discountPercent={discountPercent} displayMode="list" cardStyle={cardStyle} />
        ))}
      </div>
    )
  }

  return (
    <div className={GRID_COLS_CLASS[gridColumns]}>
      {items.map(({ product, badge, badgeColor, promotionId, promotionName, originalPrice, discountPercent }) => (
        <ProductCard key={product.id} product={product} badge={badge} badgeColor={badgeColor} promotionId={promotionId} promotionName={promotionName} originalPrice={originalPrice} discountPercent={discountPercent} displayMode="grid" cardStyle={cardStyle} />
      ))}
    </div>
  )
}

// ── Esqueleto ───────────────────────────────────────────────────────────────

function ProductSkeleton({ displayMode, gridColumns = 3 }: { displayMode: DisplayMode; gridColumns?: 2 | 3 | 4 }) {
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
    <div className={GRID_COLS_CLASS[gridColumns]}>
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
