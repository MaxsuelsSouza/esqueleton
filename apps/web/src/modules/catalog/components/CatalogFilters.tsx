'use client'

// Painel de filtros do catálogo — árvore de categorias, faixa de preço e ordenação
import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import type { CatalogFilters, Category } from '@esqueleton/shared'

interface CatalogFiltersProps {
  filters: CatalogFilters
  categories: Category[]
  onFiltersChange: (filters: CatalogFilters) => void
  // 'inline' (padrão): flex horizontal no desktop — usado na barra superior do mobile
  // 'vertical': sempre em coluna — usado na sidebar do desktop
  direction?: 'inline' | 'vertical'
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mais recentes' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
] as const

export function CatalogFilters({ filters, categories, onFiltersChange, direction = 'inline' }: CatalogFiltersProps) {
  function toggleCategory(id: string) {
    const alreadySelected = filters.categories.includes(id)
    const updated = alreadySelected
      ? filters.categories.filter((c) => c !== id)
      : [...filters.categories, id]
    onFiltersChange({ ...filters, categories: updated })
  }

  function updatePrice(field: 'priceMin' | 'priceMax', rawValue: string) {
    onFiltersChange({ ...filters, [field]: rawValue === '' ? null : Number(rawValue) })
  }

  function updateSort(value: string) {
    onFiltersChange({ ...filters, sortBy: value as CatalogFilters['sortBy'] })
  }

  return (
    <div className={direction === 'vertical' ? 'flex flex-col gap-5' : 'flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start'}>

      {/* Árvore de categorias */}
      {categories.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">Categoria</span>
          <CategoryTree
            categories={categories}
            selectedIds={filters.categories}
            onToggle={toggleCategory}
          />
        </div>
      )}

      {/* Faixa de preço */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Preço</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Mín"
            min={0}
            value={filters.priceMin ?? ''}
            onChange={(e) => updatePrice('priceMin', e.target.value)}
            className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-gray-400"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            placeholder="Máx"
            min={0}
            value={filters.priceMax ?? ''}
            onChange={(e) => updatePrice('priceMax', e.target.value)}
            className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-gray-400"
          />
        </div>
      </div>

      {/* Ordenação */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Ordenar</span>
        <select
          value={filters.sortBy}
          onChange={(e) => updateSort(e.target.value)}
          className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-gray-400"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

    </div>
  )
}

// ── Árvore de categorias com checkboxes ────────────────────────────────────

interface CategoryTreeProps {
  categories: Category[]
  selectedIds: string[]
  onToggle: (id: string) => void
  // Se verdadeiro, expande automaticamente os filhos diretos ao montar
  defaultExpanded?: boolean
  level?: number
}

function CategoryTree({
  categories,
  selectedIds,
  onToggle,
  defaultExpanded = false,
  level = 0,
}: CategoryTreeProps) {
  // Inicia com todos os nós expandidos se defaultExpanded for true
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    defaultExpanded ? new Set(categories.map((c) => c.id)) : new Set(),
  )

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className={level > 0 ? 'ml-3 border-l border-gray-100 pl-2' : ''}>
      {categories.map((cat) => {
        const hasChildren = !!cat.children?.length
        const isExpanded = expandedIds.has(cat.id)
        const isSelected = selectedIds.includes(cat.id)

        return (
          <div key={cat.id}>
            <div className="flex items-center gap-1 py-0.5">
              {/* Botão expandir/recolher — ocupa espaço mesmo sem filhos para alinhar */}
              <button
                onClick={() => toggleExpand(cat.id)}
                className={`flex h-4 w-4 shrink-0 items-center justify-center text-gray-400 transition-colors hover:text-gray-600 ${!hasChildren ? 'invisible' : ''}`}
                tabIndex={hasChildren ? 0 : -1}
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>

              {/* Checkbox + nome */}
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-700 hover:text-gray-900">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(cat.id)}
                  className="h-3.5 w-3.5 rounded accent-gray-900"
                />
                {cat.name}
              </label>
            </div>

            {/* Subcategorias */}
            {hasChildren && isExpanded && (
              <CategoryTree
                categories={cat.children!}
                selectedIds={selectedIds}
                onToggle={onToggle}
                level={level + 1}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
