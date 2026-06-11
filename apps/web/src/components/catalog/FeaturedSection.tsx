'use client'

// Seção de produtos em destaque — exibe produtos selecionados no topo da página
import { ProductCard } from './ProductCard'
import { useStoreProfile } from '@/contexts/store-profile-context'
import type { Product } from '@esqueleton/shared'
import { Sparkles } from 'lucide-react'

interface FeaturedSectionProps {
  products: Product[]
  // Título principal da seção
  title?: string
  // Texto da tag exibida no canto direito do cabeçalho
  tag?: string
  // ID e nome do destaque — usados para registrar eventos de analytics
  featuredId?: string
  featuredName?: string
}

export function FeaturedSection({
  products,
  title = 'Em destaque',
  tag = 'Destaque',
  featuredId,
  featuredName,
}: FeaturedSectionProps) {
  const { profile } = useStoreProfile()
  const themeColor = profile.themeColor ?? '#000000'

  if (products.length === 0) return null

  return (
    // Fundo usa a cor do tema com 15% de opacidade para criar um tom suave
    <section
      className="mb-10 rounded-2xl p-3 sm:p-4"
      style={{ backgroundColor: themeColor + '26' }}
    >

      {/* Cabeçalho centralizado */}
      <div className="mb-4 flex flex-col items-center gap-2 text-center">
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: themeColor }}
        >
          {tag}
        </span>
        <div className="flex items-center gap-2">
          <Sparkles size={18} style={{ color: themeColor }} />
          <h2 className="text-lg font-bold text-gray-900 sm:text-xl">{title}</h2>
        </div>
      </div>

      {/* Produtos em grade — 2 por linha no mobile, 3 no tablet, 4 no desktop */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            displayMode="grid"
            featuredId={featuredId}
            featuredName={featuredName ?? title}
          />
        ))}
      </div>

    </section>
  )
}
