'use client'

// Hook que concentra toda a lógica da página da sacola — estado, efeitos, callbacks
// A página (page.tsx) é apenas uma view que consome os valores retornados aqui

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useBag } from '@/modules/bag/contexts/bag-context'
import { useCustomer } from '@/modules/customers/contexts/customer-context'
import { useStoreProfile } from '@/modules/store-profile/contexts/store-profile-context'
import { analyticsService } from '@/modules/analytics/services/analytics.service'
import { customersService } from '@/modules/customers/services/customers.service'
import { ordersService } from '@/modules/orders/services/orders.service'
import { catalogService } from '@/modules/catalog/services/catalog.service'
import { promotionsService } from '@/modules/promotions/services/promotions.service'
import { useStoreSlug } from '@/shared/hooks/useStoreSlug'
import { applyPromotionsToProducts, getActivePromotionForProduct } from '@/modules/promotions/utils/promotions'
import { normalizePhone } from '@/shared/utils/phone'
import type { Product, Promotion, Coupon } from '@esqueleton/shared'

// Item completo para renderização — combina dados do servidor (Redis) com o produto do banco
export type FullBagItem = {
  product: Product
  quantity: number
  promotionId?: string
  promotionName?: string
  // Cor da borda da promoção — só exibe borda no card quando definida
  badgeColor?: string
  // Opções da variante selecionada (ex: { Cor: "Preto", Armazenamento: "1TB" })
  selectedOptions?: Record<string, string>
  // Preço efetivo do item — usa o preço da variante quando disponível
  effectivePrice: number
  // Preço original antes da promoção — exibido riscado
  originalPrice?: number
  // Percentual de desconto da promoção — exibido como tag (ex: "-20%")
  discountPercent?: number
}

// Chave única do item na sacola — mesmo produto com opções diferentes = itens distintos.
// Usa nome e valor de cada opção, em ordem alfabética, para {Cor: "Preto"} e
// {Material: "Preto"} nunca gerarem a mesma chave.
export function itemKey(item: { product: { id: string }; selectedOptions?: Record<string, string> }) {
  const opts = item.selectedOptions
  const optsSuffix = opts
    ? ':' + Object.entries(opts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, value]) => `${name}=${value}`)
        .join('|')
    : ''
  return item.product.id + optsSuffix
}

export function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function useSacolaPage() {
  const router = useRouter()
  const slug = useStoreSlug()
  const {
    cartItems, totalItems, isLoading: isBagLoading,
    removeItem, updateQuantity, clear,
    appliedCoupon, couponInput, setCouponInput, couponError, applyCoupon, removeCoupon,
  } = useBag()
  const { customer, setCustomer } = useCustomer()
  const { profile } = useStoreProfile()

  // Produtos buscados do banco com promoções aplicadas — mapa por ID para acesso rápido
  // rawPrice guarda o preço original do produto (antes da promoção) para calcular
  // o desconto proporcional nas variantes
  type ProductWithPromo = { product: Product; rawPrice: number; promotionId?: string; promotionName?: string; badgeColor?: string; discountPercent?: number }
  const [productMap, setProductMap] = useState<Map<string, ProductWithPromo>>(new Map())
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)

  // Busca os dados completos dos produtos e as promoções ativas para aplicar os descontos
  const productIds = useMemo(
    () => cartItems.map((i) => i.productId),
    [cartItems],
  )

  useEffect(() => {
    if (productIds.length === 0) {
      setProductMap(new Map())
      setIsLoadingProducts(false)
      return
    }

    setIsLoadingProducts(true)
    Promise.all([
      catalogService.getPublicProductsByIds(slug, productIds),
      promotionsService.listPublicPromotions(slug).catch(() => [] as Promotion[]),
    ])
      .then(([page, promos]) => {
        const products = page.data ?? []
        setPromotions(promos)
        // Guarda o preço original de cada produto antes de aplicar promoções
        const rawPrices = new Map<string, number>()
        for (const p of products) rawPrices.set(p.id, p.price)
        // Aplica promoções ativas aos produtos — mesmo cálculo usado no catálogo
        const promoted = applyPromotionsToProducts(products, promos)
        const map = new Map<string, ProductWithPromo>()
        for (const item of promoted) {
          map.set(item.product.id, {
            product: item.product,
            rawPrice: rawPrices.get(item.product.id) ?? item.product.price,
            promotionId: item.promotionId,
            promotionName: item.promotionName,
            badgeColor: item.badgeColor,
            discountPercent: item.discountPercent,
          })
        }
        setProductMap(map)
      })
      .catch(() => setProductMap(new Map()))
      .finally(() => setIsLoadingProducts(false))
  }, [slug, productIds.join(',')])

  // Combina itens da sacola (Redis) com dados dos produtos (banco) + promoção ativa.
  // Quando o item tem uma variante selecionada, usa o preço da variante em vez do preço base.
  const items: FullBagItem[] = useMemo(() => {
    const result: FullBagItem[] = []
    for (const ci of cartItems) {
      const entry = productMap.get(ci.productId)
      if (!entry) continue

      // Busca a variante pelo ID armazenado no carrinho
      const variant = ci.variantId
        ? entry.product.variants?.find((v) => v.id === ci.variantId)
        : undefined

      // Só considera promoção quando o item foi explicitamente associado a uma
      const hasPromo = !!entry.promotionId && entry.rawPrice > entry.product.price
      let effectivePrice = entry.product.price
      let originalPrice: number | undefined
      if (variant) {
        if (hasPromo) {
          const discountRate = entry.product.price / entry.rawPrice
          effectivePrice = Math.round(variant.price * discountRate * 100) / 100
          originalPrice = variant.price
        } else {
          effectivePrice = variant.price
        }
      } else if (hasPromo) {
        originalPrice = entry.rawPrice
      }

      result.push({
        product: entry.product,
        quantity: ci.quantity,
        promotionId: entry.promotionId ?? ci.promotionId,
        promotionName: entry.promotionName ?? ci.promotionName,
        badgeColor: entry.badgeColor,
        selectedOptions: ci.selectedOptions,
        effectivePrice,
        originalPrice,
        discountPercent: hasPromo ? entry.discountPercent : undefined,
      })
    }
    return result
  }, [cartItems, productMap])

  const isLoading = isBagLoading || isLoadingProducts

  // Itens selecionados para envio — usa chave única (produto + opções) para distinguir variantes
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(items.map(itemKey)),
  )

  // Chaves de itens que já passaram pela sacola nesta visita — permite auto-selecionar
  // apenas itens recém-adicionados, sem re-marcar itens que o cliente desmarcou de propósito
  const knownKeysRef = useRef<Set<string>>(new Set())

  // Sincroniza a seleção quando a sacola muda:
  // remove chaves de itens que saíram e marca apenas os recém-adicionados
  useEffect(() => {
    setSelectedKeys((prev) => {
      const next = new Set<string>()
      for (const item of items) {
        const key = itemKey(item)
        const isNewItem = !knownKeysRef.current.has(key)
        if (isNewItem || prev.has(key)) next.add(key)
      }
      knownKeysRef.current = new Set(items.map(itemKey))
      return next
    })
  }, [items])

  function toggleSelect(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedKeys.size === items.length) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(items.map(itemKey)))
    }
  }

  // Apenas os itens que o usuário marcou para enviar agora
  const selectedItems = items.filter((i) => selectedKeys.has(itemKey(i)))

  // Subtotal com preços originais (antes de qualquer promoção)
  const selectedSubtotal = selectedItems.reduce(
    (sum, { effectivePrice, originalPrice, quantity }) =>
      sum + (originalPrice ?? effectivePrice) * quantity,
    0,
  )

  // Economia das promoções — calculada apenas sobre os itens que têm promoção aplicada
  const promoItems = selectedItems.filter((i) => i.originalPrice !== undefined && i.originalPrice > i.effectivePrice)
  const promoDiscount = promoItems.reduce(
    (sum, { originalPrice, effectivePrice, quantity }) =>
      sum + (originalPrice! - effectivePrice) * quantity,
    0,
  )

  // Subtotal após promoções (usado como base para o cupom)
  const subtotalAfterPromo = selectedSubtotal - promoDiscount

  // O cupom só vale quando o pedido (após promoções, antes do cupom) atinge o valor mínimo
  const couponMinimumNotMet = !!(
    appliedCoupon?.minimumOrderValue != null &&
    subtotalAfterPromo < appliedCoupon.minimumOrderValue
  )
  const activeCoupon = appliedCoupon && !couponMinimumNotMet ? appliedCoupon : null

  // Preço unitário do item já com o cupom aplicado (quando o cupom vale para ele).
  // É exatamente este preço que a API espera receber em cada item do pedido.
  function couponUnitPrice(item: FullBagItem): number {
    if (!activeCoupon) return item.effectivePrice
    const couponApplies =
      !activeCoupon.productIds?.length ||
      activeCoupon.productIds.includes(item.product.id)
    if (!couponApplies) return item.effectivePrice
    if (activeCoupon.discountType === 'percentage' && activeCoupon.discountPercent) {
      return Math.round(item.effectivePrice * (1 - activeCoupon.discountPercent / 100) * 100) / 100
    }
    if (activeCoupon.discountType === 'fixed' && activeCoupon.discountValue) {
      return Math.max(0, Math.round((item.effectivePrice - activeCoupon.discountValue) * 100) / 100)
    }
    return item.effectivePrice
  }

  // Desconto total do cupom — soma da diferença de preço de cada item elegível
  const selectedDiscount = selectedItems.reduce(
    (sum, item) => sum + (item.effectivePrice - couponUnitPrice(item)) * item.quantity,
    0,
  )

  // ── Descontos especiais: buy_x_get_y e kit ──────────────────────────────
  // Verifica promoções ativas que requerem uma quantidade ou combinação específica.
  // Calcula o desconto adicional quando a condição é atendida, ou gera uma mensagem
  // de incentivo quando o usuário está perto de ativar a promoção.
  // Usa os preços já com cupom — o mesmo cálculo que a API faz ao validar o pedido.

  type SpecialPromoResult = {
    // Desconto extra que deve ser subtraído do total (buy_x_get_y grátis, kit preço fixo)
    extraDiscount: number
    // Mensagens de feedback para o usuário (ativados ou incentivos)
    messages: { type: 'active' | 'incentive'; text: string; promoName: string }[]
  }

  function computeSpecialPromos(): SpecialPromoResult {
    let extraDiscount = 0
    const messages: SpecialPromoResult['messages'] = []

    for (const promo of promotions) {
      if (!promo.active) continue

      if (promo.type === 'buy_x_get_y' && promo.buyQuantity && promo.getQuantity) {
        // Conta quantas unidades de produtos elegíveis estão selecionadas.
        // Lista de produtos vazia = a promoção vale para todos os produtos.
        const eligibleItems = promo.productIds.length > 0
          ? selectedItems.filter((i) => promo.productIds.includes(i.product.id))
          : selectedItems
        const totalQty = eligibleItems.reduce((sum, i) => sum + i.quantity, 0)

        if (totalQty >= promo.getQuantity) {
          // Condição atingida — calcula itens grátis
          // Ordena por preço (mais barato primeiro) para dar os mais baratos de graça
          const allUnits: number[] = []
          for (const item of eligibleItems) {
            const unitPrice = couponUnitPrice(item)
            for (let i = 0; i < item.quantity; i++) allUnits.push(unitPrice)
          }
          allUnits.sort((a, b) => a - b)

          const freeQty = promo.getQuantity - promo.buyQuantity
          // Calcula quantas vezes a promoção se aplica
          const timesApplied = Math.floor(totalQty / promo.getQuantity)
          const freeTotal = timesApplied * freeQty
          const discount = allUnits.slice(0, freeTotal).reduce((sum, p) => sum + p, 0)

          extraDiscount += discount
          messages.push({
            type: 'active',
            text: `Compre ${promo.buyQuantity} Leve ${promo.getQuantity}: -${formatCurrency(discount)}`,
            promoName: promo.name,
          })
        } else if (totalQty > 0 && totalQty < promo.getQuantity) {
          // Incentivo — falta pouco para ativar
          const falta = promo.getQuantity - totalQty
          messages.push({
            type: 'incentive',
            text: `Adicione mais ${falta} ${falta === 1 ? 'produto' : 'produtos'} e ganhe ${promo.getQuantity - promo.buyQuantity} grátis!`,
            promoName: promo.name,
          })
        }
      }

      if (promo.type === 'kit' && promo.kitPrice && promo.productIds.length > 0) {
        // Verifica se TODOS os produtos do kit estão selecionados
        const hasAll = promo.productIds.every((pid) =>
          selectedItems.some((i) => i.product.id === pid && i.quantity > 0),
        )

        if (hasAll) {
          // Soma dos preços individuais (com promoção e cupom já aplicados) vs kitPrice
          const individualTotal = promo.productIds.reduce((sum, pid) => {
            const item = selectedItems.find((i) => i.product.id === pid)
            return sum + (item ? couponUnitPrice(item) : 0)
          }, 0)

          const kitDiscount = Math.max(0, individualTotal - promo.kitPrice)
          if (kitDiscount > 0) {
            extraDiscount += kitDiscount
            messages.push({
              type: 'active',
              text: `Kit ${promo.name}: -${formatCurrency(kitDiscount)}`,
              promoName: promo.name,
            })
          }
        } else {
          // Incentivo — mostra quantos faltam
          const inCart = promo.productIds.filter((pid) =>
            selectedItems.some((i) => i.product.id === pid),
          )
          if (inCart.length > 0) {
            const falta = promo.productIds.length - inCart.length
            const formatted = promo.kitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            messages.push({
              type: 'incentive',
              text: `Adicione mais ${falta} ${falta === 1 ? 'produto' : 'produtos'} para completar o Kit por ${formatted}!`,
              promoName: promo.name,
            })
          }
        }
      }
    }

    return { extraDiscount, messages }
  }

  const specialPromos = computeSpecialPromos()

  const selectedTotal = Math.max(0, subtotalAfterPromo - selectedDiscount - specialPromos.extraDiscount)

  // Controle do modal de identificação do cliente
  const [identModalOpen, setIdentModalOpen] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [identError, setIdentError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  // Monta a mensagem formatada do pedido para enviar pelo WhatsApp
  function buildWhatsAppMessage(customerInfo: { name: string; phone: string }, orderNumber: string) {
    const now = new Date()
    const date = now.toLocaleDateString('pt-BR')
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const divider = '━━━━━━━━━━━━━━━━━━━━'

    const lines: string[] = []

    lines.push(`🛍️ *NOVO PEDIDO #${orderNumber}*`)
    lines.push(`📅 ${date} às ${time}`)

    if (customerInfo) {
      lines.push('')
      lines.push(`👤 *CLIENTE*`)
      lines.push(`Nome: *${customerInfo.name}*`)
      lines.push(`Telefone: ${customerInfo.phone}`)
    }

    lines.push('')
    lines.push(divider)
    lines.push(`📦 *PRODUTOS*`)
    lines.push(divider)

    selectedItems.forEach(({ product, quantity, promotionName, selectedOptions, effectivePrice }, index) => {
      const name = product.brand ? `${product.brand} ${product.name}` : product.name
      const optionsText = selectedOptions ? ' — ' + Object.values(selectedOptions).join(' · ') : ''
      const unitPrice = effectivePrice
      const lineTotal = unitPrice * quantity

      lines.push('')
      lines.push(`*${index + 1}. ${name}${optionsText}*`)
      lines.push(`   🔢 ${quantity} ${quantity === 1 ? 'unidade' : 'unidades'} × ${formatCurrency(unitPrice)}`)

      if (promotionName) {
        lines.push(`   🏷️ Promoção: *${promotionName}*`)
      }

      lines.push(`   💵 Subtotal: *${formatCurrency(lineTotal)}*`)
    })

    lines.push('')
    lines.push(divider)
    lines.push(`💰 *RESUMO*`)
    lines.push(divider)
    lines.push('')

    lines.push(`Subtotal: ${formatCurrency(selectedSubtotal)}`)

    if (promoDiscount > 0) {
      lines.push(`🏷️ Promoções (${promoItems.length} ${promoItems.length === 1 ? 'item' : 'itens'}): -${formatCurrency(promoDiscount)}`)
    }

    // Descontos especiais (buy_x_get_y, kit) exibidos individualmente
    for (const msg of specialPromos.messages) {
      if (msg.type === 'active') {
        lines.push(`🎁 ${msg.text}`)
      }
    }

    if (appliedCoupon && selectedDiscount > 0) {
      lines.push(`🎟️ Cupom *${appliedCoupon.code}*: -${formatCurrency(selectedDiscount)}`)
      if (appliedCoupon.description) {
        lines.push(`   _${appliedCoupon.description}_`)
      }
    }

    lines.push('')

    lines.push(`💳 *TOTAL: ${formatCurrency(selectedTotal)}*`)
    lines.push('')
    lines.push(divider)
    lines.push('Aguardando confirmação ✅')

    return lines.join('\n')
  }

  // Efetivamente abre o WhatsApp, salva o pedido e dispara analytics — tudo em paralelo
  function goToWhatsApp(customerInfo: { name: string; phone: string }) {
    const rawWhatsapp = profile.whatsapp ?? ''
    if (!rawWhatsapp) {
      alert('Esta loja ainda não configurou o WhatsApp.')
      return
    }

    // Sufixo aleatório reduz a chance de dois clientes gerarem o mesmo número no mesmo segundo
    const orderNumber =
      String(Date.now()).slice(-6) + String(Math.floor(Math.random() * 100)).padStart(2, '0')

    const whatsappNumber = normalizePhone(rawWhatsapp)
    const message = encodeURIComponent(buildWhatsAppMessage(customerInfo, orderNumber))
    const url = `https://wa.me/${whatsappNumber}?text=${message}`
    window.open(url, '_blank')

    // Monta os itens no contrato que a API valida: unitPrice já com promoção E cupom,
    // subtotal = soma dos itens, discount apenas com os descontos especiais (kit / leve Y)
    const orderItems = selectedItems.map((item) => {
      const { product, quantity, promotionName, selectedOptions } = item
      const unitPrice = couponUnitPrice(item)
      return {
        productId: product.id,
        productName: product.brand
          ? `${product.brand} ${product.name}${selectedOptions ? ' — ' + Object.values(selectedOptions).join(' · ') : ''}`
          : `${product.name}${selectedOptions ? ' — ' + Object.values(selectedOptions).join(' · ') : ''}`,
        quantity,
        unitPrice,
        lineTotal: Math.round(unitPrice * quantity * 100) / 100,
        promotionName: promotionName ?? undefined,
      }
    })
    const orderSubtotal = Math.round(orderItems.reduce((sum, i) => sum + i.lineTotal, 0) * 100) / 100
    const orderDiscount = Math.round(specialPromos.extraDiscount * 100) / 100
    const orderTotal = Math.max(0, Math.round((orderSubtotal - orderDiscount) * 100) / 100)

    // Salva o pedido no banco da loja — não bloqueia o WhatsApp, mas avisa se falhar
    ordersService.create(slug, {
      orderNumber,
      customerName: customerInfo.name,
      customerPhone: customerInfo.phone,
      items: orderItems,
      subtotal: orderSubtotal,
      discount: orderDiscount,
      total: orderTotal,
      // Só envia o código quando o cupom realmente descontou algo — evita
      // contar uso de cupom em pedidos que ele não afetou
      couponCode: activeCoupon && selectedDiscount > 0 ? activeCoupon.code : undefined,
    }).then((result) => {
      if (!result.ok) {
        alert('Seu pedido foi enviado pelo WhatsApp, mas não pôde ser registrado no sistema da loja. A loja ainda receberá sua mensagem normalmente.')
      }
    })

    // Registra analytics — fire and forget
    for (const { product, promotionId, promotionName } of selectedItems) {
      analyticsService.recordEvent(slug, {
        productId: product.id,
        productName: product.brand ? `${product.brand} ${product.name}` : product.name,
        eventType: 'WHATSAPP_SEND',
        promotionId,
        promotionName,
        couponCode: appliedCoupon?.code,
      })
    }

    // Remove os itens enviados da sacola
    for (const { product, selectedOptions } of selectedItems) {
      removeItem(product.id, selectedOptions)
    }
  }

  // Clique no botão principal — se já identificado, vai direto; senão, abre o modal
  function handleSendWhatsApp() {
    if (customer) {
      goToWhatsApp(customer)
    } else {
      setNameInput('')
      setPhoneInput('')
      setIdentError(null)
      setIdentModalOpen(true)
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }

  // Confirmação do modal — salva cliente, abre WhatsApp imediatamente
  function handleIdentConfirm() {
    const name = nameInput.trim()
    const phone = phoneInput.trim()

    if (!name) { setIdentError('Informe seu nome.'); return }
    // Mesma regra da página de produto: DDD + número (10 ou 11 dígitos)
    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setIdentError('Informe um telefone válido com DDD (10 ou 11 dígitos).')
      return
    }

    const info = { name, phone }
    setCustomer(info)
    setIdentModalOpen(false)
    goToWhatsApp(info)

    // Salva no banco da loja em paralelo — fire and forget
    customersService.upsert(slug, name, phone)
  }

  // Abre o modal de identificação com dados pré-preenchidos (para alterar)
  function openIdentModalForEdit() {
    setIdentModalOpen(true)
    setNameInput(customer!.name)
    setPhoneInput(customer!.phone)
    setIdentError(null)
  }

  function closeIdentModal() {
    setIdentModalOpen(false)
  }

  function handleModalBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) setIdentModalOpen(false)
  }

  return {
    router,
    slug,
    // Sacola
    items,
    totalItems,
    isLoading,
    removeItem,
    updateQuantity,
    clear,
    // Seleção
    selectedKeys,
    toggleSelect,
    toggleSelectAll,
    selectedItems,
    // Totais
    selectedSubtotal,
    promoItems,
    promoDiscount,
    selectedDiscount,
    specialPromos,
    selectedTotal,
    // Cupom
    appliedCoupon,
    couponInput,
    setCouponInput,
    couponError,
    couponMinimumNotMet,
    applyCoupon,
    removeCoupon,
    // Cliente
    customer,
    identModalOpen,
    nameInput,
    setNameInput,
    phoneInput,
    setPhoneInput,
    identError,
    nameRef,
    openIdentModalForEdit,
    closeIdentModal,
    handleModalBackdropClick,
    // Ações
    handleSendWhatsApp,
    handleIdentConfirm,
    // Utilitários
    formatCurrency,
  }
}
