'use client'

// Carrossel horizontal de sugestões de produtos — exibido no detalhe do produto
// Mostra produtos da mesma categoria para incentivar a descoberta

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductCard } from './ProductCard'
import type { Product } from '@esqueleton/shared'

interface ProductSuggestionsProps {
  products: Product[]
  title?: string
  isLoading?: boolean
}

export function ProductSuggestions({ products, title = 'Você também pode gostar', isLoading }: ProductSuggestionsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (isLoading) {
    return (
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-bold text-gray-900">{title}</h2>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-44 shrink-0 sm:w-52">
              <div className="aspect-square animate-pulse rounded-2xl bg-gray-200" />
              <div className="mt-3 space-y-2 px-1">
                <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (products.length === 0) return null

  function scroll(direction: 'left' | 'right') {
    if (!scrollRef.current) return
    const distance = scrollRef.current.clientWidth * 0.7
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    })
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {/* Setas de navegação — visíveis apenas no desktop */}
        {products.length > 3 && (
          <div className="hidden gap-2 sm:flex">
            <button
              onClick={() => scroll('left')}
              className="rounded-full border border-gray-200 p-1.5 text-gray-400 hover:border-gray-400 hover:text-gray-700"
              aria-label="Rolar para a esquerda"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll('right')}
              className="rounded-full border border-gray-200 p-1.5 text-gray-400 hover:border-gray-400 hover:text-gray-700"
              aria-label="Rolar para a direita"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-4 overflow-x-auto pb-2"
      >
        {products.map((product) => (
          <div key={product.id} className="w-44 shrink-0 sm:w-52">
            <ProductCard product={product} displayMode="grid" />
          </div>
        ))}
      </div>
    </section>
  )
}
