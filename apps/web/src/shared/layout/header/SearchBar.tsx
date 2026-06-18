'use client'

// Barra de pesquisa com sugestões — usada no cabeçalho (desktop e mobile expandido)
// Conforme o usuário digita, busca produtos na API com debounce e exibe um dropdown
import { Search, ShoppingBag, Loader2, X } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { catalogService } from '@/modules/catalog/services/catalog.service'
import { useStoreSlug } from '@/shared/hooks/useStoreSlug'
import type { Product } from '@esqueleton/shared'

// Tempo de espera antes de disparar a busca (ms)
const DEBOUNCE_MS = 300
// Quantidade de sugestões exibidas
const MAX_SUGGESTIONS = 6

interface SearchBarProps {
  onSearch?: (term: string) => void
  autoFocus?: boolean
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function SearchBar({ onSearch, autoFocus }: SearchBarProps) {
  const router = useRouter()
  const slug = useStoreSlug()
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  // Índice do item destacado pelo teclado (-1 = nenhum)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Busca sugestões com debounce
  const fetchSuggestions = useCallback((term: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = term.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await catalogService.listPublicProducts(slug, {
          search: trimmed,
          pageSize: MAX_SUGGESTIONS,
        })
        setSuggestions(result.data)
        setShowDropdown(true)
      } catch {
        setSuggestions([])
      } finally {
        setIsSearching(false)
      }
    }, DEBOUNCE_MS)
  }, [slug])

  // Limpa o timeout ao desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleChange(value: string) {
    setSearchTerm(value)
    setHighlightIndex(-1)
    fetchSuggestions(value)
  }

  function navigateToProduct(product: Product) {
    setShowDropdown(false)
    setSearchTerm('')
    setSuggestions([])
    router.push(`/loja/${slug}/produto/${product.id}`)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // Navegação pelo teclado dentro das sugestões
    if (showDropdown && suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setHighlightIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
        return
      }
      if (event.key === 'Enter' && highlightIndex >= 0) {
        event.preventDefault()
        navigateToProduct(suggestions[highlightIndex])
        return
      }
    }

    if (event.key === 'Enter' && onSearch) {
      setShowDropdown(false)
      onSearch(searchTerm)
    }

    if (event.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full md:w-auto">
      <div className="flex w-full items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 transition-colors focus-within:border-gray-400 focus-within:bg-white">
        {isSearching ? (
          <Loader2 size={16} className="shrink-0 animate-spin text-gray-400" />
        ) : (
          <Search size={16} className="shrink-0 text-gray-400" />
        )}
        <input
          type="text"
          placeholder="Pesquisar produtos..."
          value={searchTerm}
          autoFocus={autoFocus}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true) }}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400 md:w-48"
        />
        {searchTerm && (
          <button
            onClick={() => handleChange('')}
            aria-label="Limpar pesquisa"
            className="shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown de sugestões */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
          {suggestions.length > 0 ? (
            <ul>
              {suggestions.map((product, index) => (
                <li key={product.id}>
                  <button
                    onClick={() => navigateToProduct(product)}
                    onMouseEnter={() => setHighlightIndex(index)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      index === highlightIndex ? 'bg-gray-50' : ''
                    }`}
                  >
                    {/* Miniatura do produto */}
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                          <ShoppingBag size={16} strokeWidth={1.5} />
                        </div>
                      )}
                    </div>

                    {/* Nome e preço */}
                    <div className="min-w-0 flex-1">
                      {product.brand && (
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                          {product.brand}
                        </p>
                      )}
                      <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
                    </div>

                    <span className="shrink-0 text-sm font-semibold text-gray-900">
                      {formatBRL(product.price)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              Nenhum produto encontrado
            </div>
          )}
        </div>
      )}
    </div>
  )
}
