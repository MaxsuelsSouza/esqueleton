'use client'

// Página de favoritos — exibe os produtos salvos pelo cliente com promoções aplicadas
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, ArrowLeft } from 'lucide-react'
import { useFavorites } from '@/contexts/favorites-context'
import { catalogService } from '@/services/catalog.service'
import { promotionsService } from '@/services/promotions.service'
import { applyPromotionsToProducts, type PromotedProduct } from '@/utils/promotions'
import { ProductCard } from '@/components/catalog/ProductCard'
import { useStoreSlug } from '@/hooks/useStoreSlug'
import type { Product, Promotion } from '@esqueleton/shared'

export default function FavoritosPage() {
  const router = useRouter()
  const slug = useStoreSlug()
  const { favoriteIds } = useFavorites()
  const [products, setProducts] = useState<Product[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (favoriteIds.length === 0) {
      setProducts([])
      setIsLoading(false)
      return
    }

    Promise.all([
      catalogService.getPublicProductsByIds(slug, favoriteIds),
      promotionsService.listPublicPromotions(slug).catch(() => [] as Promotion[]),
    ])
      .then(([page, promos]) => {
        setProducts(page.data ?? [])
        setPromotions(promos)
      })
      .catch(() => setProducts([]))
      .finally(() => setIsLoading(false))
  }, [slug, favoriteIds.length])

  // Aplica promoções ativas aos produtos favoritos
  const promotedProducts = useMemo(
    () => applyPromotionsToProducts(products, promotions),
    [products, promotions],
  )

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
                : `${promotedProducts.length} produto${promotedProducts.length !== 1 ? 's' : ''} salvo${promotedProducts.length !== 1 ? 's' : ''}`}
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
        {!isLoading && promotedProducts.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {promotedProducts.map(({ product, badge, badgeColor, promotionId, promotionName, originalPrice, discountPercent }) => (
              <ProductCard key={product.id} product={product} badge={badge} badgeColor={badgeColor} promotionId={promotionId} promotionName={promotionName} originalPrice={originalPrice} discountPercent={discountPercent} displayMode="grid" />
            ))}
          </div>
        )}

        {/* Estado vazio — nenhum produto favoritado */}
        {!isLoading && promotedProducts.length === 0 && (
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
