// Testes unitários da validação de preço contra o banco
import { describe, it, expect } from 'vitest'
import { validateOrderPrices, validateOrderArithmetic } from './order.service'

const produto = { id: 'p1', price: 100, variants: [] }

describe('validateOrderArithmetic', () => {
  it('aceita aritmética correta', () => {
    expect(
      validateOrderArithmetic({
        items: [{ productId: 'p1', unitPrice: 50, quantity: 2, lineTotal: 100 }],
        subtotal: 100,
        discount: 0,
        total: 100,
      })
    ).toBe(true)
  })

  it('rejeita lineTotal inconsistente', () => {
    expect(
      validateOrderArithmetic({
        items: [{ productId: 'p1', unitPrice: 50, quantity: 2, lineTotal: 50 }],
        subtotal: 50,
        discount: 0,
        total: 50,
      })
    ).toBe(false)
  })
})

describe('validateOrderPrices', () => {
  it('aceita quando unitPrice bate com o preço do banco', () => {
    const result = validateOrderPrices(
      [{ productId: 'p1', unitPrice: 100, quantity: 1, lineTotal: 100 }],
      [produto],
      [],
    )
    expect(result.valid).toBe(true)
  })

  it('rejeita quando unitPrice difere do preço do banco', () => {
    const result = validateOrderPrices(
      [{ productId: 'p1', unitPrice: 50, quantity: 1, lineTotal: 50 }],
      [produto],
      [],
    )
    expect(result.valid).toBe(false)
    expect(result.message).toContain('preço')
  })

  it('rejeita quando o produto não existe no banco', () => {
    const result = validateOrderPrices(
      [{ productId: 'p999', unitPrice: 100, quantity: 1, lineTotal: 100 }],
      [produto],
      [],
    )
    expect(result.valid).toBe(false)
    expect(result.message).toContain('não foram encontrados')
  })

  it('aceita preço de variante ativa', () => {
    const produtoComVariante = {
      ...produto,
      variants: [{ id: 'v1', price: 150, active: true }],
    }
    const result = validateOrderPrices(
      [{ productId: 'p1', unitPrice: 150, quantity: 1, lineTotal: 150 }],
      [produtoComVariante],
      [],
    )
    expect(result.valid).toBe(true)
  })

  it('rejeita preço de variante inativa', () => {
    const produtoComVariante = {
      ...produto,
      variants: [{ id: 'v1', price: 200, active: false }],
    }
    const result = validateOrderPrices(
      [{ productId: 'p1', unitPrice: 200, quantity: 1, lineTotal: 200 }],
      [produtoComVariante],
      [],
    )
    expect(result.valid).toBe(false)
  })

  it('aceita preço com desconto percentual de promoção', () => {
    const promo = {
      id: 'pr1',
      name: '20% OFF',
      type: 'percentage',
      discountPercent: 20,
      discountValue: null,
      kitPrice: null,
      productIds: ['p1'],
      startDate: null,
      endDate: null,
      startTime: null,
      endTime: null,
      active: true,
      priority: 0,
    }
    // R$100 com 20% off = R$80
    const result = validateOrderPrices(
      [{ productId: 'p1', unitPrice: 80, quantity: 1, lineTotal: 80 }],
      [produto],
      [promo],
    )
    expect(result.valid).toBe(true)
  })

  it('aceita preço com desconto fixo de promoção', () => {
    const promo = {
      id: 'pr1',
      name: 'R$30 OFF',
      type: 'fixed',
      discountPercent: null,
      discountValue: 30,
      kitPrice: null,
      productIds: ['p1'],
      startDate: null,
      endDate: null,
      startTime: null,
      endTime: null,
      active: true,
      priority: 0,
    }
    // R$100 - R$30 = R$70
    const result = validateOrderPrices(
      [{ productId: 'p1', unitPrice: 70, quantity: 1, lineTotal: 70 }],
      [produto],
      [promo],
    )
    expect(result.valid).toBe(true)
  })

  it('aceita preço com cupom percentual', () => {
    const cupom = {
      discountType: 'percentage',
      discountPercent: 10,
      discountValue: null,
      productIds: [],
    }
    // R$100 com cupom de 10% = R$90
    const result = validateOrderPrices(
      [{ productId: 'p1', unitPrice: 90, quantity: 1, lineTotal: 90 }],
      [produto],
      [],
      cupom,
    )
    expect(result.valid).toBe(true)
  })

  it('aceita preço com cupom fixo', () => {
    const cupom = {
      discountType: 'fixed',
      discountPercent: null,
      discountValue: 15,
      productIds: [],
    }
    // R$100 - R$15 = R$85
    const result = validateOrderPrices(
      [{ productId: 'p1', unitPrice: 85, quantity: 1, lineTotal: 85 }],
      [produto],
      [],
      cupom,
    )
    expect(result.valid).toBe(true)
  })

  it('ignora cupom quando produto não está na lista elegível', () => {
    const cupom = {
      discountType: 'fixed',
      discountPercent: null,
      discountValue: 15,
      productIds: ['outro-produto'],
    }
    // Cupom não se aplica a p1 — preço deve ser o cheio (R$100)
    const result = validateOrderPrices(
      [{ productId: 'p1', unitPrice: 100, quantity: 1, lineTotal: 100 }],
      [produto],
      [],
      cupom,
    )
    expect(result.valid).toBe(true)
  })

  it('aceita preço com promoção + cupom combinados', () => {
    const promo = {
      id: 'pr1',
      name: '20% OFF',
      type: 'percentage',
      discountPercent: 20,
      discountValue: null,
      kitPrice: null,
      productIds: ['p1'],
      startDate: null,
      endDate: null,
      startTime: null,
      endTime: null,
      active: true,
      priority: 0,
    }
    const cupom = {
      discountType: 'fixed',
      discountPercent: null,
      discountValue: 10,
      productIds: [],
    }
    // R$100 com 20% off = R$80, depois -R$10 do cupom = R$70
    const result = validateOrderPrices(
      [{ productId: 'p1', unitPrice: 70, quantity: 1, lineTotal: 70 }],
      [produto],
      [promo],
      cupom,
    )
    expect(result.valid).toBe(true)
  })

  it('aceita diferença de meio centavo (tolerância de arredondamento)', () => {
    const produtoDecimal = { id: 'p1', price: 100, variants: [] }
    // 100.005 arredondado para 100.01 — diferença de 0.01, dentro da tolerância
    const result = validateOrderPrices(
      [{ productId: 'p1', unitPrice: 100.005, quantity: 1, lineTotal: 100.005 }],
      [produtoDecimal],
      [],
    )
    expect(result.valid).toBe(true)
  })

  it('rejeita diferença de 2 centavos', () => {
    const produtoDecimal = { id: 'p1', price: 100, variants: [] }
    const result = validateOrderPrices(
      [{ productId: 'p1', unitPrice: 100.02, quantity: 1, lineTotal: 100.02 }],
      [produtoDecimal],
      [],
    )
    expect(result.valid).toBe(false)
  })

  it('aceita preço de kit rateado entre produtos', () => {
    const p2 = { id: 'p2', price: 80, variants: [] }
    const promo = {
      id: 'pr1',
      name: 'Kit',
      type: 'kit',
      discountPercent: null,
      discountValue: null,
      kitPrice: 150,
      productIds: ['p1', 'p2'],
      startDate: null,
      endDate: null,
      startTime: null,
      endTime: null,
      active: true,
      priority: 0,
    }
    // Kit de R$150 dividido por 2 produtos = R$75 cada
    const result = validateOrderPrices(
      [
        { productId: 'p1', unitPrice: 75, quantity: 1, lineTotal: 75 },
        { productId: 'p2', unitPrice: 75, quantity: 1, lineTotal: 75 },
      ],
      [produto, p2],
      [promo],
    )
    expect(result.valid).toBe(true)
  })
})
