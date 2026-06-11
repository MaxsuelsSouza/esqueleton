'use client'

// Página de favoritos — exibe os produtos salvos pelo cliente
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, ArrowLeft } from 'lucide-react'
import { useFavorites } from '@/contexts/favorites-context'
import { catalogService } from '@/services/catalog.service'
import { ProductCard } from '@/components/catalog/ProductCard'
import { useStoreSlug } from '@/hooks/useStoreSlug'
import type { Product } from '@esqueleton/shared'

export default function FavoritosPage() {
  const router = useRouter()
  const slug = useStoreSlug()
  const { favoriteIds } = useFavorites()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (favoriteIds.length === 0) {
      setIsLoading(false)
      return
    }

    catalogService.getPublicProductsByIds(slug, favoriteIds)
      .then((page) => setProducts(page.data ?? []))
      .catch(() => setProducts([]))
      .finally(() => setIsLoading(false))
  }, [slug, favoriteIds.length])

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-8">

        {/* Cabeçalho da página */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Voltar"
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Favoritos</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {isLoading
                ? 'Carregando...'
                : `${products.length} produto${products.length !== 1 ? 's' : ''} salvo${products.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {/* Esqueleto de carregamento */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-gray-200" />
            ))}
          </div>
        )}

        {/* Lista de produtos favoritos */}
        {!isLoading && products.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} displayMode="grid" />
            ))}
          </div>
        )}

        {/* Estado vazio — nenhum produto favoritado */}
        {!isLoading && products.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Heart size={28} strokeWidth={1.5} className="text-gray-300" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-700">Nenhum favorito ainda</p>
              <p className="mt-1 text-sm text-gray-400">
                Toque no coração de um produto para salvá-lo aqui.
              </p>
            </div>
            <button
              onClick={() => router.push(`/loja/${slug}`)}
              className="mt-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
            >
              Ver catálogo
            </button>
          </div>
        )}

      </div>
    </main>
  )
}
