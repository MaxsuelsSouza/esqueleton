'use client'

// Componente switch que renderiza o componente correto do catálogo
// baseado no tipo definido no layout. Usado na página pública para
// montar o catálogo dinamicamente a partir do layout salvo pelo admin.
import { CatalogSearch } from './CatalogSearch'
import { CatalogSearchCompact } from './CatalogSearchCompact'
import { CatalogFilters } from './CatalogFilters'
import { DisplayToggle } from './DisplayToggle'
import { FeaturedSection } from '@/modules/featured/components/FeaturedSection'
import type {
  CatalogComponentConfig,
  CatalogComponentType,
  Product,
  Category,
  Featured,
  CatalogFilters as CatalogFiltersType,
  DisplayMode,
  ProductCardStyle,
} from '@esqueleton/shared'

// Dados que os componentes precisam para renderizar — passados pela página do catálogo
export interface CatalogWidgetData {
  // Busca
  searchTerm: string
  onSearchChange: (value: string) => void
  // Filtros
  filters: CatalogFiltersType
  categories: Category[]
  onFiltersChange: (filters: CatalogFiltersType) => void
  activeFilterCount: number
  onClearFilters: () => void
  filtersOpen: boolean
  onFiltersOpenChange: (open: boolean) => void
  // Exibição
  displayMode: DisplayMode
  onDisplayChange: (mode: DisplayMode) => void
  // Destaque
  activeFeatured: Featured | null
  promotedFeatured: Product[]
  // Produtos — renderizado diretamente na página, não aqui
  // Anúncios — renderizado pelo AnnouncementBar no layout
}

interface CatalogWidgetProps {
  type: CatalogComponentType
  config?: CatalogComponentConfig
  data: CatalogWidgetData
  // Flags de estado da página
  isLoading: boolean
  hasActiveFilters: boolean
  page: number
}

export function CatalogWidget({ type, config, data, isLoading, hasActiveFilters, page }: CatalogWidgetProps) {
  switch (type) {
    case 'search':
      if (config?.searchStyle === 'compact') {
        return <CatalogSearchCompact value={data.searchTerm} onChange={data.onSearchChange} />
      }
      return <CatalogSearch value={data.searchTerm} onChange={data.onSearchChange} />

    case 'filters':
      return (
        <div className="sticky top-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Filtros</h2>
            {data.activeFilterCount > 0 && (
              <button
                onClick={data.onClearFilters}
                className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-700"
              >
                Limpar
              </button>
            )}
          </div>
          <CatalogFilters
            filters={data.filters}
            categories={data.categories}
            onFiltersChange={data.onFiltersChange}
            direction="vertical"
          />
        </div>
      )

    case 'display-toggle':
      return (
        <div className="flex justify-end">
          <DisplayToggle current={data.displayMode} onChange={data.onDisplayChange} />
        </div>
      )

    case 'featured':
      if (isLoading || !data.activeFeatured || hasActiveFilters || page !== 1) return null
      return (
        <FeaturedSection
          products={data.promotedFeatured}
          title={data.activeFeatured.title}
          tag={data.activeFeatured.tag}
          featuredId={data.activeFeatured.id}
          featuredName={data.activeFeatured.title}
          carousel={data.activeFeatured.carousel}
          variant={config?.featuredStyle}
        />
      )

    case 'announcements':
      // Renderizado separadamente pelo AnnouncementBar no layout da loja
      return null

    case 'products':
      // Renderizado diretamente na página (precisa do ProductGrid e estados de loading/error)
      return null

    default:
      return null
  }
}
