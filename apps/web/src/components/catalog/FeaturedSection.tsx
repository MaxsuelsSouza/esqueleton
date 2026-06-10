'use client'

// Seção de produtos em destaque — exibe produtos selecionados no topo da página
import { ProductCard } from './ProductCard'
import type { Product } from '@esqueleton/shared'
import { Sparkles } from 'lucide-react'

interface FeaturedSectionProps {
  products: Product[]
  // Título principal da seção
  title?: string
  // Texto da tag exibida no canto direito do cabeçalho
  tag?: string
}

export function FeaturedSection({
  products,
  title = 'Em destaque',
  tag = 'Destaque',
}: FeaturedSectionProps) {
  if (products.length === 0) return null

  return (
    <section className="mb-10 rounded-2xl bg-blue-100 p-4 sm:p-6">

      {/* Cabeçalho — título à esquerda, tag à direita */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-yellow-500" />
          <h2 className="text-lg font-bold text-gray-900 sm:text-xl">{title}</h2>
        </div>

        {/* Tag modificável no canto direito */}
        <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white">
          {tag}
        </span>
      </div>

      {/* Produtos em grade de 2 colunas */}
      <div className="grid grid-cols-2 gap-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} displayMode="grid" />
        ))}
      </div>

    </section>
  )
}
