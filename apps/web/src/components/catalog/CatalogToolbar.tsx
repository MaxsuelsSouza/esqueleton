'use client'

// Barra de controles do catálogo — busca, filtros e tipo de exibição
// Mobile: busca + botão "Filtros" que abre/fecha o painel de filtros
// Desktop: busca + filtros sempre visíveis + alternador de exibição
import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { CatalogSearch } from './CatalogSearch'
import { CatalogFilters } from './CatalogFilters'
import { DisplayToggle } from './DisplayToggle'
import type { CatalogFilters as CatalogFiltersType, Category, DisplayMode } from '@esqueleton/shared'

interface CatalogToolbarProps {
  categories?: Category[]
  onChange: (filters: CatalogFiltersType, displayMode: DisplayMode) => void
}

const DEFAULT_FILTERS: CatalogFiltersType = {
  searchTerm: '',
  categories: [],
  priceMin: null,
  priceMax: null,
  sortBy: 'newest',
}

export function CatalogToolbar({ categories = [], onChange }: CatalogToolbarProps) {
  const [filters, setFilters] = useState<CatalogFiltersType>(DEFAULT_FILTERS)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid')
  // Controla se o painel de filtros está aberto (usado no mobile)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Conta quantos filtros estão ativos para mostrar no botão
  const activeFilterCount =
    filters.categories.length +
    (filters.priceMin !== null ? 1 : 0) +
    (filters.priceMax !== null ? 1 : 0) +
    (filters.sortBy !== 'newest' ? 1 : 0)

  function handleFiltersChange(updatedFilters: CatalogFiltersType) {
    setFilters(updatedFilters)
    onChange(updatedFilters, displayMode)
  }

  function handleSearchChange(searchTerm: string) {
    handleFiltersChange({ ...filters, searchTerm })
  }

  function handleDisplayChange(mode: DisplayMode) {
    setDisplayMode(mode)
    onChange(filters, mode)
  }

  function handleClearFilters() {
    const cleared = { ...DEFAULT_FILTERS, searchTerm: filters.searchTerm }
    setFilters(cleared)
    onChange(cleared, displayMode)
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">

      {/* Linha principal — busca + botão de filtros (mobile) + alternador de exibição */}
      <div className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
        <CatalogSearch value={filters.searchTerm} onChange={handleSearchChange} />

        {/* Botão "Filtros" — visível somente no mobile */}
        <button
          onClick={() => setFiltersOpen((prev) => !prev)}
          aria-label="Abrir filtros"
          className={`relative flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-sm font-medium transition-colors sm:hidden ${
            filtersOpen || activeFilterCount > 0
              ? 'border-black bg-black text-white'
              : 'border-gray-200 text-gray-600 hover:border-gray-400'
          }`}
        >
          <SlidersHorizontal size={15} />
          Filtros
          {/* Bolinha indicando filtros ativos */}
          {activeFilterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black">
              {activeFilterCount}
            </span>
          )}
        </button>

        <DisplayToggle current={displayMode} onChange={handleDisplayChange} />
      </div>

      {/* Painel de filtros — sempre visível no desktop, colapsável no mobile */}
      <div className={`border-t border-gray-100 ${filtersOpen ? 'block' : 'hidden sm:block'}`}>
        {/* Cabeçalho do painel com botão Limpar */}
        <div className="flex items-center justify-between px-3 pt-3 sm:px-4 sm:pt-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Filtros</span>
          {activeFilterCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
        <div className="p-3 sm:p-4">
          <CatalogFilters
            filters={filters}
            categories={categories}
            onFiltersChange={handleFiltersChange}
          />
        </div>
      </div>

    </div>
  )
}
