// Funções para validar e aplicar cupons de desconto no catálogo
import type { Coupon, Product } from '@esqueleton/shared'

// Motivos pelos quais um cupom pode ser inválido
export type CouponError =
  | 'not_found'      // Código não existe
  | 'inactive'       // Cupom desativado
  | 'expired'        // Fora do período de validade
  | 'exhausted'      // Limite de usos atingido

export type CouponValidation =
  | { valid: true; coupon: Coupon }
  | { valid: false; error: CouponError }

// Valida um código de cupom — retorna o cupom ou o motivo do erro
export function validateCoupon(code: string, coupons: Coupon[]): CouponValidation {
  const coupon = coupons.find((c) => c.code === code.toUpperCase().trim())

  if (!coupon) return { valid: false, error: 'not_found' }
  if (!coupon.active) return { valid: false, error: 'inactive' }

  const today = new Date().toISOString().split('T')[0]
  if (coupon.startDate && today < coupon.startDate) return { valid: false, error: 'inactive' }
  if (coupon.endDate && today > coupon.endDate) return { valid: false, error: 'expired' }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, error: 'exhausted' }
  }

  return { valid: true, coupon }
}

// Mensagem de erro legível para exibir ao cliente
export function couponErrorMessage(error: CouponError): string {
  switch (error) {
    case 'not_found': return 'Cupom não encontrado.'
    case 'inactive': return 'Este cupom não está disponível.'
    case 'expired': return 'Este cupom está expirado.'
    case 'exhausted': return 'Este cupom atingiu o limite de usos.'
  }
}

// Aplica o desconto do cupom ao preço de um produto
// Retorna null se o cupom não se aplica ao produto
export function applyCouponToProduct(product: Product, coupon: Coupon): Product | null {
  // Se o cupom lista produtos específicos, verifica se este está incluído
  if (coupon.productIds && coupon.productIds.length > 0) {
    if (!coupon.productIds.includes(product.id)) return null
  }

  if (coupon.discountType === 'percentage' && coupon.discountPercent) {
    const discounted = Math.round(product.price * (1 - coupon.discountPercent / 100) * 100) / 100
    return { ...product, price: discounted, originalPrice: product.originalPrice ?? product.price }
  }

  if (coupon.discountType === 'fixed' && coupon.discountValue) {
    const discounted = Math.max(0, Math.round((product.price - coupon.discountValue) * 100) / 100)
    return { ...product, price: discounted, originalPrice: product.originalPrice ?? product.price }
  }

  return null
}
