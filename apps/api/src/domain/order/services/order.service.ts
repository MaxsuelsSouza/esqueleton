// Validação de pedidos — confere totais e preços contra o banco de dados

type OrderItem = {
  productId: string
  lineTotal: number
  unitPrice: number
  quantity: number
  promotionName?: string
}

type OrderData = {
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
}

// ── Tipos usados na validação de preço contra o banco ──────────────

type ProductRecord = {
  id: string
  price: number
  variants?: { id: string; price: number; active: boolean }[]
}

type PromotionRecord = {
  id: string
  name: string
  type: string
  discountPercent?: number | null
  discountValue?: number | null
  kitPrice?: number | null
  buyQuantity?: number | null
  getQuantity?: number | null
  productIds: string[]
  startDate?: string | null
  endDate?: string | null
  startTime?: string | null
  endTime?: string | null
  active: boolean
  priority: number
}

type CouponRecord = {
  discountType: string
  discountPercent?: number | null
  discountValue?: number | null
  productIds: string[]
}

// ── Promoções — lógica espelhada do frontend ───────────────────────

// Verifica se uma promoção está ativa agora (flag, período e janela de horário)
function isPromotionActive(promo: PromotionRecord): boolean {
  if (!promo.active) return false

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const currentTime = now.toTimeString().slice(0, 5)

  if (promo.startDate && today < promo.startDate) return false
  if (promo.endDate && today > promo.endDate) return false
  if (promo.startTime && currentTime < promo.startTime) return false
  if (promo.endTime && currentTime > promo.endTime) return false

  return true
}

// Retorna a primeira promoção ativa que inclui o produto (ordenada por prioridade)
function getActivePromotionForProduct(
  productId: string,
  promotions: PromotionRecord[],
): PromotionRecord | null {
  return (
    promotions.find(
      (promo) =>
        (promo.productIds.length === 0 || promo.productIds.includes(productId)) &&
        isPromotionActive(promo),
    ) ?? null
  )
}

// Calcula o preço do produto após aplicar uma promoção
function computePromotedPrice(basePrice: number, promotion: PromotionRecord): number {
  switch (promotion.type) {
    case 'percentage': {
      if (!promotion.discountPercent) return basePrice
      return Math.round(basePrice * (1 - promotion.discountPercent / 100) * 100) / 100
    }
    case 'fixed': {
      if (!promotion.discountValue) return basePrice
      return Math.max(0, Math.round((basePrice - promotion.discountValue) * 100) / 100)
    }
    case 'kit': {
      if (!promotion.kitPrice || promotion.productIds.length === 0) return basePrice
      return Math.round((promotion.kitPrice / promotion.productIds.length) * 100) / 100
    }
    // buy_x_get_y e custom não alteram o preço unitário
    default:
      return basePrice
  }
}

// ── Cupom — desconto adicional sobre o preço (já com promoção) ─────

function computeCouponDiscountedPrice(price: number, coupon: CouponRecord): number {
  if (coupon.discountType === 'percentage' && coupon.discountPercent) {
    return Math.round(price * (1 - coupon.discountPercent / 100) * 100) / 100
  }
  if (coupon.discountType === 'fixed' && coupon.discountValue) {
    return Math.max(0, Math.round((price - coupon.discountValue) * 100) / 100)
  }
  return price
}

// ── Validação de preços contra o banco ─────────────────────────────

// Compara o unitPrice de cada item do pedido com o preço real do produto no banco,
// levando em conta promoções ativas e cupom aplicado.
// Retorna { valid: true } ou { valid: false, message } com mensagem em português.
export function validateOrderPrices(
  items: OrderItem[],
  products: ProductRecord[],
  promotions: PromotionRecord[],
  coupon?: CouponRecord | null,
): { valid: boolean; message?: string } {
  const productMap = new Map(products.map((p) => [p.id, p]))

  for (const item of items) {
    const product = productMap.get(item.productId)

    if (!product) {
      return { valid: false, message: 'Um ou mais produtos do pedido não foram encontrados. Atualize sua sacola.' }
    }

    // Monta a lista de preços válidos: preço base + preços das variantes ativas
    const validBasePrices = [product.price]
    if (product.variants) {
      for (const v of product.variants) {
        if (v.active) validBasePrices.push(v.price)
      }
    }

    // Para cada preço-base candidato, calcula o preço esperado (com promoção e cupom)
    // e verifica se algum deles bate com o unitPrice enviado pelo cliente
    const promo = getActivePromotionForProduct(item.productId, promotions)
    let matched = false

    for (const basePrice of validBasePrices) {
      let expectedPrice = basePrice

      // Aplica promoção se houver
      if (promo) {
        expectedPrice = computePromotedPrice(basePrice, promo)
      }

      // Aplica cupom se houver e se o produto está na lista elegível
      if (coupon) {
        const couponAppliesToProduct =
          coupon.productIds.length === 0 || coupon.productIds.includes(item.productId)
        if (couponAppliesToProduct) {
          expectedPrice = computeCouponDiscountedPrice(expectedPrice, coupon)
        }
      }

      // Tolerância de 1 centavo para arredondamentos
      if (Math.abs(expectedPrice - item.unitPrice) <= 0.01) {
        matched = true
        break
      }
    }

    if (!matched) {
      return { valid: false, message: 'O preço de um ou mais produtos mudou. Atualize sua sacola.' }
    }
  }

  return { valid: true }
}

// ── Desconto extra de buy_x_get_y e kit — validação server-side ───
// Calcula o desconto especial esperado com base nos itens do pedido e promoções ativas.
// Retorna o valor total que deveria ser descontado além das promoções por-item e cupom.

export function computeExpectedSpecialDiscount(
  items: OrderItem[],
  promotions: PromotionRecord[],
): number {
  let extraDiscount = 0

  for (const promo of promotions) {
    if (!isPromotionActive(promo)) continue

    if (promo.type === 'buy_x_get_y' && promo.productIds.length > 0) {
      const buyQty = promo.buyQuantity
      const getQty = promo.getQuantity
      if (!buyQty || !getQty || getQty <= buyQty) continue

      // Conta unidades elegíveis no pedido
      const eligibleItems = items.filter((i) => promo.productIds.includes(i.productId))
      const totalQty = eligibleItems.reduce((sum, i) => sum + i.quantity, 0)

      if (totalQty >= getQty) {
        // Coleta todos os preços unitários (repetidos pela quantidade)
        const allUnits: number[] = []
        for (const item of eligibleItems) {
          for (let i = 0; i < item.quantity; i++) allUnits.push(item.unitPrice)
        }
        allUnits.sort((a, b) => a - b)

        const freeQty = getQty - buyQty
        const timesApplied = Math.floor(totalQty / getQty)
        const freeTotal = timesApplied * freeQty
        const discount = allUnits.slice(0, freeTotal).reduce((sum, p) => sum + p, 0)
        extraDiscount += discount
      }
    }
  }

  return extraDiscount
}

// Confere a aritmética do pedido — impede totais manipulados por requisições
// montadas fora do site (tolerância de 1 centavo para arredondamentos)
export function validateOrderArithmetic(data: OrderData): boolean {
  const somaDosItens = data.items.reduce((soma, item) => soma + item.lineTotal, 0)
  const itemComContaErrada = data.items.some(
    (item) => Math.abs(item.lineTotal - item.unitPrice * item.quantity) > 0.01
  )
  const subtotalNaoConfere = Math.abs(data.subtotal - somaDosItens) > 0.01
  const totalNaoConfere =
    data.discount > data.subtotal || Math.abs(data.total - (data.subtotal - data.discount)) > 0.01

  return !itemComContaErrada && !subtotalNaoConfere && !totalNaoConfere
}
