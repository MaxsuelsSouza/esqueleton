// Funções para aplicar promoções ativas aos produtos no catálogo
import type { Product, Promotion, PromotionType } from '@esqueleton/shared'

// Verifica se uma promoção está ativa agora — considera flag, período e janela de horário
export function isPromotionActive(promotion: Promotion): boolean {
  if (!promotion.active) return false

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const currentTime = now.toTimeString().slice(0, 5) // "HH:mm"

  if (promotion.startDate && today < promotion.startDate) return false
  if (promotion.endDate && today > promotion.endDate) return false
  if (promotion.startTime && currentTime < promotion.startTime) return false
  if (promotion.endTime && currentTime > promotion.endTime) return false

  return true
}

// Retorna a primeira promoção ativa que inclui o produto.
// Quando productIds está vazio, a promoção vale para todos os produtos.
export function getActivePromotionForProduct(
  productId: string,
  promotions: Promotion[],
): Promotion | null {
  return (
    promotions.find(
      (promo) =>
        (promo.productIds.length === 0 || promo.productIds.includes(productId)) &&
        isPromotionActive(promo),
    ) ?? null
  )
}

// Resultado da promoção aplicada a um produto
export interface PromotedProduct {
  product: Product
  // Texto exibido na borda colorida do card (ex: "Compre 2 Leve 3")
  badge?: string
  // Cor hexadecimal da borda do card (ex: "#f97316") — vinda da promoção
  badgeColor?: string
  // ID e nome da promoção ativa — usados para registrar eventos de analytics
  promotionId?: string
  promotionName?: string
  // Preço original do produto antes da promoção — usado para exibir riscado
  originalPrice?: number
  // Percentual de desconto aplicado — usado para exibir a tag "-20%"
  discountPercent?: number
  // Metadata da promoção — permite ao público entender as regras
  promotionDescription?: string
  promotionType?: PromotionType
  promotionProductIds?: string[]
  buyQuantity?: number
  getQuantity?: number
  kitPrice?: number
}

// Aplica uma promoção ao produto — modifica preço e define badge conforme o tipo
export function applyPromotionToProduct(product: Product, promotion: Promotion): PromotedProduct {
  const badgeColor = promotion.color ?? undefined
  // Metadados da promoção passados adiante para analytics e exibição pública
  const promoMeta = {
    promotionId: promotion.id,
    promotionName: promotion.name,
    promotionDescription: promotion.description,
    promotionType: promotion.type,
    promotionProductIds: promotion.productIds,
    buyQuantity: promotion.buyQuantity,
    getQuantity: promotion.getQuantity,
    kitPrice: promotion.kitPrice,
  }

  switch (promotion.type) {
    case 'percentage': {
      if (!promotion.discountPercent) break
      const discounted = Math.round(product.price * (1 - promotion.discountPercent / 100) * 100) / 100
      return {
        product: { ...product, price: discounted },
        badge: promotion.name,
        badgeColor,
        originalPrice: product.price,
        discountPercent: promotion.discountPercent,
        ...promoMeta,
      }
    }

    case 'fixed': {
      if (!promotion.discountValue) break
      const discounted = Math.max(0, Math.round((product.price - promotion.discountValue) * 100) / 100)
      const percent = Math.round(((product.price - discounted) / product.price) * 100)
      return {
        product: { ...product, price: discounted },
        badge: promotion.name,
        badgeColor,
        originalPrice: product.price,
        discountPercent: percent,
        ...promoMeta,
      }
    }

    case 'buy_x_get_y': {
      const { buyQuantity, getQuantity } = promotion
      const badge =
        buyQuantity && getQuantity
          ? `Compre ${buyQuantity} Leve ${getQuantity}`
          : promotion.name
      return { product, badge, badgeColor, ...promoMeta }
    }

    case 'kit': {
      if (!promotion.kitPrice) break
      const pricePerItem = Math.round((promotion.kitPrice / promotion.productIds.length) * 100) / 100
      const percent = Math.round(((product.price - pricePerItem) / product.price) * 100)
      return {
        product: { ...product, price: pricePerItem },
        badge: 'Kit',
        badgeColor,
        originalPrice: product.price,
        discountPercent: percent > 0 ? percent : undefined,
        ...promoMeta,
      }
    }

    case 'custom': {
      return { product, badge: promotion.name, badgeColor, ...promoMeta }
    }
  }

  return { product }
}

// Aplica todas as promoções ativas a uma lista de produtos
export function applyPromotionsToProducts(
  products: Product[],
  promotions: Promotion[],
): PromotedProduct[] {
  return products.map((product) => {
    const promo = getActivePromotionForProduct(product.id, promotions)
    if (!promo) return { product }
    return applyPromotionToProduct(product, promo)
  })
}
