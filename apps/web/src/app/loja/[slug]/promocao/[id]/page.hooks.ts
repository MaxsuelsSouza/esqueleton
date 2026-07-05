'use client'

// Hook da página de promoção — carrega a promoção pelo ID da URL e
// busca todos os produtos que participam dela
import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useStoreSlug } from '@/shared/hooks/useStoreSlug'
import { catalogService } from '@/modules/catalog/services/catalog.service'
import { promotionsService } from '@/modules/promotions/services/promotions.service'
import { applyPromotionToProduct } from '@/modules/promotions/utils/promotions'
import type { Product, Promotion } from '@esqueleton/shared'

export function usePromocaoPage() {
  const slug = useStoreSlug()
  const params = useParams<{ id: string }>()
  const promotionId = params?.id

  const [promotion, setPromotion] = useState<Promotion | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug || !promotionId) return
    setIsLoading(true)
    setError(null)

    // A rota pública retorna só promoções ativas — a promoção é localizada pelo ID
    promotionsService
      .listPublicPromotions(slug)
      .then(async (promos) => {
        const found = promos.find((promo) => promo.id === promotionId)
        if (!found) {
          setError('Promoção não encontrada ou não está mais ativa.')
          return
        }
        setPromotion(found)

        // Promoção com lista de produtos: busca por IDs.
        // Lista vazia significa que a promoção vale para o catálogo inteiro.
        const result =
          found.productIds.length > 0
            ? await catalogService.getPublicProductsByIds(slug, found.productIds)
            : await catalogService.listPublicProducts(slug, { pageSize: 500 })
        setProducts(result.data)
      })
      .catch(() => setError('Não foi possível carregar a promoção. Tente novamente.'))
      .finally(() => setIsLoading(false))
  }, [slug, promotionId])

  // Aplica a promoção em cada produto — preço com desconto, badge e metadados
  const promotedItems = useMemo(
    () => (promotion ? products.map((product) => applyPromotionToProduct(product, promotion)) : []),
    [products, promotion],
  )

  return { slug, promotion, promotedItems, isLoading, error }
}
