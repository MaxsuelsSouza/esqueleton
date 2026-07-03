// ─────────────────────────────────────────────────────────────────────────────
// VALIDAÇÃO DO COMMIT 0f1b16c — "test: atualizar teste do kit para o novo contrato"
//
// Contexto: no commit eb7287e (item 7 da varredura de bugs) o comportamento do
// kit mudou. Antes, a promoção "kit" rateava o preço fechado entre os produtos e
// gravava isso no preço unitário — o que permitia comprar UM item do kit sozinho
// por uma fração do preço. Agora:
//
//   • O preço unitário do item avulso é SEMPRE o preço cheio.
//   • O desconto do kit só existe quando TODOS os produtos do kit estão no pedido,
//     e entra no campo `discount` (validado à parte por computeExpectedSpecialDiscount).
//
// Este arquivo tranca esse contrato: preço cheio aceito, rateio antigo recusado,
// e o desconto especial calculado só com o kit completo.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest'
import { validateOrderPrices, computeExpectedSpecialDiscount } from '../../domain/order/services/order.service'

// Kit: p1 (R$100) + p2 (R$80) por R$150 fechado (desconto embutido de R$30)
const P1 = { id: 'p1', price: 100, variants: [] as { id: string; price: number; active: boolean }[] }
const P2 = { id: 'p2', price: 80, variants: [] as { id: string; price: number; active: boolean }[] }

const PROMO_KIT = {
  id: 'kit-1',
  name: 'Kit Duo',
  type: 'kit',
  discountPercent: null,
  discountValue: null,
  kitPrice: 150,
  buyQuantity: null,
  getQuantity: null,
  productIds: ['p1', 'p2'],
  startDate: null,
  endDate: null,
  startTime: null,
  endTime: null,
  active: true,
  priority: 0,
}

// ─────────────────────────────────────────────────────────────────────────────
describe('0f1b16c · preço unitário do item do kit é o cheio', () => {
  it('CENÁRIO: os dois itens do kit enviados pelo preço cheio → aceito', () => {
    const resultado = validateOrderPrices(
      [
        { productId: 'p1', unitPrice: 100, quantity: 1, lineTotal: 100 },
        { productId: 'p2', unitPrice: 80, quantity: 1, lineTotal: 80 },
      ],
      [P1, P2],
      [PROMO_KIT],
    )
    expect(resultado.valid).toBe(true)
  })

  it('CENÁRIO: rateio antigo (kitPrice ÷ 2 = R$75 por item) → REJEITADO', () => {
    // Era exatamente esse rateio que deixava vender um item do kit por R$75.
    const resultado = validateOrderPrices(
      [
        { productId: 'p1', unitPrice: 75, quantity: 1, lineTotal: 75 },
        { productId: 'p2', unitPrice: 75, quantity: 1, lineTotal: 75 },
      ],
      [P1, P2],
      [PROMO_KIT],
    )
    expect(resultado.valid).toBe(false)
  })

  it('CENÁRIO: comprar SÓ um item do kit → paga o preço cheio, sem fração', () => {
    // Item isolado do kit: aceito só a R$100 (cheio); a fração R$75 é recusada.
    expect(
      validateOrderPrices([{ productId: 'p1', unitPrice: 100, quantity: 1, lineTotal: 100 }], [P1, P2], [PROMO_KIT]).valid,
    ).toBe(true)
    expect(
      validateOrderPrices([{ productId: 'p1', unitPrice: 75, quantity: 1, lineTotal: 75 }], [P1, P2], [PROMO_KIT]).valid,
    ).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('0f1b16c · desconto do kit calculado no campo discount', () => {
  it('CENÁRIO: kit completo → desconto = soma individual − preço fechado', () => {
    const desconto = computeExpectedSpecialDiscount(
      [
        { productId: 'p1', unitPrice: 100, quantity: 1, lineTotal: 100 },
        { productId: 'p2', unitPrice: 80, quantity: 1, lineTotal: 80 },
      ],
      [PROMO_KIT],
    )
    // 180 (100+80) − 150 = 30
    expect(desconto).toBe(30)
  })

  it('CENÁRIO: kit incompleto (falta p2) → nenhum desconto', () => {
    const desconto = computeExpectedSpecialDiscount(
      [{ productId: 'p1', unitPrice: 100, quantity: 1, lineTotal: 100 }],
      [PROMO_KIT],
    )
    expect(desconto).toBe(0)
  })

  it('CENÁRIO: kit inativo não gera desconto mesmo com todos os itens', () => {
    const desconto = computeExpectedSpecialDiscount(
      [
        { productId: 'p1', unitPrice: 100, quantity: 1, lineTotal: 100 },
        { productId: 'p2', unitPrice: 80, quantity: 1, lineTotal: 80 },
      ],
      [{ ...PROMO_KIT, active: false }],
    )
    expect(desconto).toBe(0)
  })

  it('CENÁRIO: kitPrice maior que a soma individual não vira desconto negativo', () => {
    const desconto = computeExpectedSpecialDiscount(
      [
        { productId: 'p1', unitPrice: 100, quantity: 1, lineTotal: 100 },
        { productId: 'p2', unitPrice: 80, quantity: 1, lineTotal: 80 },
      ],
      [{ ...PROMO_KIT, kitPrice: 500 }],
    )
    // max(0, 180 − 500) = 0
    expect(desconto).toBe(0)
  })
})
