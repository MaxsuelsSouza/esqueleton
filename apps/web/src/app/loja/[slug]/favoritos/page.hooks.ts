'use client'

// Hook que concentra toda a lógica de estado e efeitos da página de favoritos
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useFavorites } from '@/modules/favorites/contexts/favorites-context'
import { catalogService } from '@/modules/catalog/services/catalog.service'
import { promotionsService } from '@/modules/promotions/services/promotions.service'
import { applyPromotionsToProducts, type PromotedProduct } from '@/modules/promotions/utils/promotions'
import { useStoreSlug } from '@/shared/hooks/useStoreSlug'
import type { Product, Promotion } from '@esqueleton/shared'

export function useFavoritosPage() {
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

  return {
    router,
    slug,
    isLoading,
    promotedProducts,
  }
}
