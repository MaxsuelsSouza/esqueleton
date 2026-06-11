// Testes das funções de validação e aplicação de cupons
import { describe, it, expect } from 'vitest'
import type { Coupon, Product } from '@esqueleton/shared'
import { validateCoupon, couponErrorMessage, applyCouponToProduct } from './coupons'

// Fábrica de cupom de teste — sobrescreva apenas o que importa em cada cenário
function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: 'c1',
    code: 'DESCONTO10',
    discountType: 'percentage',
    discountPercent: 10,
    usedCount: 0,
    productIds: [],
    active: true,
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

describe('validateCoupon', () => {
  it('aceita um cupom ativo e dentro do prazo', () => {
    const result = validateCoupon('DESCONTO10', [makeCoupon()])
    expect(result.valid).toBe(true)
  })

  it('ignora maiúsculas/minúsculas e espaços no código digitado', () => {
    const result = validateCoupon('  desconto10  ', [makeCoupon()])
    expect(result.valid).toBe(true)
  })

  it('recusa código inexistente', () => {
    const result = validateCoupon('NAOEXISTE', [makeCoupon()])
    expect(result).toEqual({ valid: false, error: 'not_found' })
  })

  it('recusa cupom desativado', () => {
    const result = validateCoupon('DESCONTO10', [makeCoupon({ active: false })])
    expect(result).toEqual({ valid: false, error: 'inactive' })
  })

  it('recusa cupom expirado', () => {
    const result = validateCoupon('DESCONTO10', [makeCoupon({ endDate: '2020-01-01' })])
    expect(result).toEqual({ valid: false, error: 'expired' })
  })

  it('recusa cupom que atingiu o limite de usos', () => {
    const result = validateCoupon('DESCONTO10', [makeCoupon({ maxUses: 5, usedCount: 5 })])
    expect(result).toEqual({ valid: false, error: 'exhausted' })
  })

  it('tem mensagem legível para cada motivo de recusa', () => {
    expect(couponErrorMessage('not_found')).toBe('Cupom não encontrado.')
    expect(couponErrorMessage('inactive')).toBe('Este cupom não está disponível.')
    expect(couponErrorMessage('expired')).toBe('Este cupom está expirado.')
    expect(couponErrorMessage('exhausted')).toBe('Este cupom atingiu o limite de usos.')
  })
})

describe('applyCouponToProduct', () => {
  it('aplica desconto percentual ao preço', () => {
    const result = applyCouponToProduct(makeProduct({ price: 100 }), makeCoupon({ discountPercent: 10 }))
    expect(result?.price).toBe(90)
    expect(result?.originalPrice).toBe(100)
  })

  it('aplica desconto de valor fixo ao preço', () => {
    const result = applyCouponToProduct(
      makeProduct({ price: 100 }),
      makeCoupon({ discountType: 'fixed', discountValue: 30, discountPercent: undefined })
    )
    expect(result?.price).toBe(70)
  })

  it('nunca deixa o preço ficar negativo', () => {
    const result = applyCouponToProduct(
      makeProduct({ price: 20 }),
      makeCoupon({ discountType: 'fixed', discountValue: 50, discountPercent: undefined })
    )
    expect(result?.price).toBe(0)
  })

  it('retorna null quando o cupom é restrito a outros produtos', () => {
    const result = applyCouponToProduct(
      makeProduct({ id: 'p1' }),
      makeCoupon({ productIds: ['p2', 'p3'] })
    )
    expect(result).toBeNull()
  })

  it('aplica quando o produto está na lista de elegíveis do cupom', () => {
    const result = applyCouponToProduct(
      makeProduct({ id: 'p1', price: 100 }),
      makeCoupon({ productIds: ['p1'] })
    )
    expect(result?.price).toBe(90)
  })
})
