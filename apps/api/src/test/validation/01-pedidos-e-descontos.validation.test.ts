// ─────────────────────────────────────────────────────────────────────────────
// VALIDAÇÃO DO COMMIT eb7287e — "fix: corrigir bugs invisíveis do dia a dia"
//
// O que este commit prometeu e o que este arquivo confere:
//   • Pedidos com promoção E cupom são aceitos pela API (contrato de preço novo).
//   • O campo `discount` do pedido é validado contra as promoções reais.
//   • Cupom passa a respeitar `minimumOrderValue`.
//   • Cupom só afeta os produtos elegíveis (`productIds`).
//   • "Compre X Leve Y" com `productIds` vazio desconta (vale para todos).
//   • A aritmética do pedido barra totais manipulados (discount > subtotal, etc.).
//
// Tudo aqui é teste de função pura (sem banco, sem HTTP) — roda com:
//   pnpm --filter @esqueleton/api test
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest'
import {
  validateOrderPrices,
  computeExpectedSpecialDiscount,
  validateOrderArithmetic,
} from '../../domain/order/services/order.service'

// ── Fábricas de dados para deixar cada cenário curto e legível ────────────────

function produto(id: string, price: number, variants: { id: string; price: number; active: boolean }[] = []) {
  return { id, price, variants }
}

function promocao(over: Partial<Parameters<typeof computeExpectedSpecialDiscount>[1][number]> = {}) {
  return {
    id: 'promo-1',
    name: 'Promo',
    type: 'percentage',
    discountPercent: null,
    discountValue: null,
    kitPrice: null,
    buyQuantity: null,
    getQuantity: null,
    productIds: [] as string[],
    startDate: null,
    endDate: null,
    startTime: null,
    endTime: null,
    active: true,
    priority: 0,
    ...over,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
describe('eb7287e · validateOrderPrices — preço unitário conferido contra o banco', () => {
  it('CENÁRIO: sacola com promoção percentual + cupom fixo (o combo que quebrava)', () => {
    // Produto R$100 → 20% off = R$80 → cupom -R$10 = R$70
    const promo = promocao({ type: 'percentage', discountPercent: 20, productIds: ['p1'] })
    const cupom = { discountType: 'fixed', discountPercent: null, discountValue: 10, productIds: [] }

    const resultado = validateOrderPrices(
      [{ productId: 'p1', unitPrice: 70, quantity: 1, lineTotal: 70 }],
      [produto('p1', 100)],
      [promo],
      cupom,
    )

    expect(resultado.valid).toBe(true)
  })

  it('CENÁRIO: cliente adultera o preço para baixo → rejeitado com mensagem clara', () => {
    const resultado = validateOrderPrices(
      [{ productId: 'p1', unitPrice: 1, quantity: 1, lineTotal: 1 }],
      [produto('p1', 100)],
      [],
    )

    expect(resultado.valid).toBe(false)
    expect(resultado.message).toContain('preço')
  })

  it('CENÁRIO: produto sumiu do catálogo entre montar a sacola e enviar', () => {
    const resultado = validateOrderPrices(
      [{ productId: 'fantasma', unitPrice: 100, quantity: 1, lineTotal: 100 }],
      [produto('p1', 100)],
      [],
    )

    expect(resultado.valid).toBe(false)
    expect(resultado.message).toContain('não foram encontrados')
  })

  it('CENÁRIO: preço de variante ativa é aceito; de variante inativa é recusado', () => {
    const comVariantes = produto('p1', 100, [
      { id: 'v-ativa', price: 150, active: true },
      { id: 'v-inativa', price: 999, active: false },
    ])

    expect(
      validateOrderPrices([{ productId: 'p1', unitPrice: 150, quantity: 1, lineTotal: 150 }], [comVariantes], []).valid,
    ).toBe(true)

    expect(
      validateOrderPrices([{ productId: 'p1', unitPrice: 999, quantity: 1, lineTotal: 999 }], [comVariantes], []).valid,
    ).toBe(false)
  })

  it('CENÁRIO: tolerância de arredondamento — aceita meio centavo, rejeita dois', () => {
    // A tolerância é de 1 centavo (<= 0.01). Ficamos longe da fronteira de propósito:
    // em ponto flutuante, 100.01 - 100 já dá 0.01000...5 e estouraria a régua.
    const p = produto('p1', 100)
    expect(validateOrderPrices([{ productId: 'p1', unitPrice: 100.005, quantity: 1, lineTotal: 100.005 }], [p], []).valid).toBe(true)
    expect(validateOrderPrices([{ productId: 'p1', unitPrice: 100.02, quantity: 1, lineTotal: 100.02 }], [p], []).valid).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('eb7287e · cupom respeita minimumOrderValue e productIds', () => {
  it('CENÁRIO: pedido abaixo do valor mínimo do cupom é bloqueado', () => {
    const cupom = { discountType: 'fixed', discountPercent: null, discountValue: 10, productIds: [], minimumOrderValue: 200 }

    const resultado = validateOrderPrices(
      // 1 unidade de R$100 (preço com promoção antes do cupom) → subtotal 100 < 200
      [{ productId: 'p1', unitPrice: 90, quantity: 1, lineTotal: 90 }],
      [produto('p1', 100)],
      [],
      cupom,
    )

    expect(resultado.valid).toBe(false)
    expect(resultado.message).toContain('valor mínimo')
  })

  it('CENÁRIO: pedido acima do valor mínimo passa', () => {
    const cupom = { discountType: 'fixed', discountPercent: null, discountValue: 10, productIds: [], minimumOrderValue: 150 }

    const resultado = validateOrderPrices(
      // 2 × R$100 = subtotal 200 (antes do cupom) ≥ 150; unitPrice já com -R$10
      [{ productId: 'p1', unitPrice: 90, quantity: 2, lineTotal: 180 }],
      [produto('p1', 100)],
      [],
      cupom,
    )

    expect(resultado.valid).toBe(true)
  })

  it('CENÁRIO: cupom restrito a outro produto NÃO desconta o item da sacola', () => {
    const cupom = { discountType: 'fixed', discountPercent: null, discountValue: 30, productIds: ['outro'] }

    // p1 não está na lista do cupom → preço esperado é o cheio (R$100)
    const cheio = validateOrderPrices([{ productId: 'p1', unitPrice: 100, quantity: 1, lineTotal: 100 }], [produto('p1', 100)], [], cupom)
    expect(cheio.valid).toBe(true)

    // tentar aplicar o desconto mesmo assim (R$70) é rejeitado
    const comDesconto = validateOrderPrices([{ productId: 'p1', unitPrice: 70, quantity: 1, lineTotal: 70 }], [produto('p1', 100)], [], cupom)
    expect(comDesconto.valid).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('eb7287e · computeExpectedSpecialDiscount — desconto especial no campo discount', () => {
  it('CENÁRIO: "Compre 2 Leve 3" com productIds VAZIO desconta a unidade mais barata', () => {
    // Bug corrigido: antes, lista vazia (todos os produtos) não descontava nada.
    const promo = promocao({ type: 'buy_x_get_y', buyQuantity: 2, getQuantity: 3, productIds: [] })

    const desconto = computeExpectedSpecialDiscount(
      [
        { productId: 'p1', unitPrice: 30, quantity: 2, lineTotal: 60 },
        { productId: 'p2', unitPrice: 10, quantity: 1, lineTotal: 10 },
      ],
      [promo],
    )

    // 3 unidades, leva 1 grátis: a mais barata (R$10)
    expect(desconto).toBe(10)
  })

  it('CENÁRIO: "Compre 2 Leve 3" aplicado duas vezes (6 unidades → 2 grátis)', () => {
    const promo = promocao({ type: 'buy_x_get_y', buyQuantity: 2, getQuantity: 3, productIds: ['p1'] })

    const desconto = computeExpectedSpecialDiscount(
      [{ productId: 'p1', unitPrice: 20, quantity: 6, lineTotal: 120 }],
      [promo],
    )

    // 6/3 = 2 aplicações × 1 grátis = 2 unidades a R$20 = R$40
    expect(desconto).toBe(40)
  })

  it('CENÁRIO: quantidade insuficiente não gera desconto', () => {
    const promo = promocao({ type: 'buy_x_get_y', buyQuantity: 2, getQuantity: 3, productIds: [] })
    const desconto = computeExpectedSpecialDiscount([{ productId: 'p1', unitPrice: 20, quantity: 2, lineTotal: 40 }], [promo])
    expect(desconto).toBe(0)
  })

  it('CENÁRIO: promoção inativa é ignorada no cálculo do desconto', () => {
    const promo = promocao({ type: 'buy_x_get_y', buyQuantity: 1, getQuantity: 2, productIds: [], active: false })
    const desconto = computeExpectedSpecialDiscount([{ productId: 'p1', unitPrice: 20, quantity: 4, lineTotal: 80 }], [promo])
    expect(desconto).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('eb7287e · validateOrderArithmetic — barra totais manipulados', () => {
  it('CENÁRIO: pedido coerente é aceito', () => {
    expect(
      validateOrderArithmetic({
        items: [{ productId: 'p1', unitPrice: 50, quantity: 2, lineTotal: 100 }],
        subtotal: 100,
        discount: 20,
        total: 80,
      }),
    ).toBe(true)
  })

  it('CENÁRIO: lineTotal ≠ unitPrice × quantity é rejeitado', () => {
    expect(
      validateOrderArithmetic({
        items: [{ productId: 'p1', unitPrice: 50, quantity: 2, lineTotal: 50 }],
        subtotal: 50,
        discount: 0,
        total: 50,
      }),
    ).toBe(false)
  })

  it('CENÁRIO: desconto maior que o subtotal é rejeitado (total negativo forjado)', () => {
    expect(
      validateOrderArithmetic({
        items: [{ productId: 'p1', unitPrice: 50, quantity: 1, lineTotal: 50 }],
        subtotal: 50,
        discount: 60,
        total: -10,
      }),
    ).toBe(false)
  })

  it('CENÁRIO: total que não fecha (subtotal - discount) é rejeitado', () => {
    expect(
      validateOrderArithmetic({
        items: [{ productId: 'p1', unitPrice: 50, quantity: 1, lineTotal: 50 }],
        subtotal: 50,
        discount: 10,
        total: 30, // deveria ser 40
      }),
    ).toBe(false)
  })
})
