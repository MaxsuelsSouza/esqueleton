// Testes das funções de promoções — ativação por data/horário e cálculo de preço
import { describe, it, expect } from 'vitest'
import type { Product, Promotion } from '@esqueleton/shared'
import {
  isPromotionActive,
  applyPromotionToProduct,
  applyPromotionsToProducts,
} from './promotions'

function makePromotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 'promo1',
    name: 'Promoção Teste',
    type: 'percentage',
    discountPercent: 20,
    productIds: ['p1'],
    active: true,
    priority: 0,
    createdAt: '2026-01-01',
    ...overrides,
  }
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Perfume Teste',
    description: null,
    price: 100,
    imageUrl: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  }
}

describe('isPromotionActive', () => {
  it('promoção ativa sem datas está sempre valendo', () => {
    expect(isPromotionActive(makePromotion())).toBe(true)
  })

  it('promoção desativada nunca vale', () => {
    expect(isPromotionActive(makePromotion({ active: false }))).toBe(false)
  })

  it('promoção com data de término no passado não vale', () => {
    expect(isPromotionActive(makePromotion({ endDate: '2020-01-01' }))).toBe(false)
  })

  it('promoção com data de início no futuro ainda não vale', () => {
    expect(isPromotionActive(makePromotion({ startDate: '2099-01-01' }))).toBe(false)
  })
})

describe('applyPromotionToProduct', () => {
  it('desconto percentual reduz o preço', () => {
    const result = applyPromotionToProduct(makeProduct({ price: 100 }), makePromotion())
    expect(result.product.price).toBe(80)
    expect(result.product.originalPrice).toBe(100)
    expect(result.badge).toBe('Promoção Teste')
  })

  it('desconto fixo nunca deixa o preço negativo', () => {
    const result = applyPromotionToProduct(
      makeProduct({ price: 30 }),
      makePromotion({ type: 'fixed', discountValue: 50, discountPercent: undefined })
    )
    expect(result.product.price).toBe(0)
  })

  it('compre X leve Y não muda o preço, apenas a etiqueta', () => {
    const result = applyPromotionToProduct(
      makeProduct({ price: 100 }),
      makePromotion({ type: 'buy_x_get_y', buyQuantity: 2, getQuantity: 3, discountPercent: undefined })
    )
    expect(result.product.price).toBe(100)
    expect(result.badge).toBe('Compre 2 Leve 3')
  })

  it('kit divide o preço do kit pela quantidade de produtos', () => {
    const result = applyPromotionToProduct(
      makeProduct({ price: 100 }),
      makePromotion({ type: 'kit', kitPrice: 90, productIds: ['p1', 'p2', 'p3'], discountPercent: undefined })
    )
    expect(result.product.price).toBe(30)
  })
})

describe('applyPromotionsToProducts', () => {
  it('aplica a promoção apenas aos produtos incluídos nela', () => {
    const produtos = [makeProduct({ id: 'p1', price: 100 }), makeProduct({ id: 'p2', price: 100 })]
    const result = applyPromotionsToProducts(produtos, [makePromotion({ productIds: ['p1'] })])

    expect(result[0].product.price).toBe(80)   // p1 está na promoção
    expect(result[1].product.price).toBe(100)  // p2 não está
    expect(result[1].badge).toBeUndefined()
  })

  it('ignora promoções desativadas', () => {
    const result = applyPromotionsToProducts(
      [makeProduct({ price: 100 })],
      [makePromotion({ active: false })]
    )
    expect(result[0].product.price).toBe(100)
  })
})
