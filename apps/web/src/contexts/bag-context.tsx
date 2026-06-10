'use client'

// Contexto global da sacola de compras — persiste os itens no localStorage
import { createContext, useContext, useState, useEffect } from 'react'
import type { Product, Coupon } from '@esqueleton/shared'
import { validateCoupon, couponErrorMessage } from '@/utils/coupons'
import { couponsService } from '@/services/coupons.service'
import { analyticsService } from '@/services/analytics.service'

export type BagItem = {
  product: Product
  quantity: number
  // Promoção ativa no momento em que o produto foi adicionado — usado nos eventos de analytics
  promotionId?: string
  promotionName?: string
}

// Metadados opcionais que acompanham o produto ao ser adicionado à sacola
type AddItemMeta = {
  promotionId?: string
  promotionName?: string
}

interface BagContextValue {
  items: BagItem[]
  totalItems: number
  addItem: (product: Product, meta?: AddItemMeta) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clear: () => void
  // Cupom aplicado na sacola
  appliedCoupon: Coupon | null
  couponInput: string
  setCouponInput: (v: string) => void
  couponError: string | null
  applyCoupon: () => void
  removeCoupon: () => void
  // Totais calculados
  subtotal: number
  discount: number
  total: number
}

const BagContext = createContext<BagContextValue | null>(null)

const STORAGE_KEY = 'bag_items'

export function BagProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<BagItem[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState<string | null>(null)

  // Recupera a sacola salva no navegador ao iniciar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setItems(JSON.parse(saved))
    } catch {}
  }, [])

  // Carrega os cupons disponíveis para validação
  useEffect(() => {
    couponsService.listCoupons().then(setCoupons).catch(() => {})
  }, [])

  // Salva a sacola no navegador sempre que mudar
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  function addItem(product: Product, meta?: AddItemMeta) {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        )
      }
      return [...prev, { product, quantity: 1, promotionId: meta?.promotionId, promotionName: meta?.promotionName }]
    })

    // Registra o evento de analytics — fire and forget, nunca bloqueia o usuário
    analyticsService.recordEvent({
      productId: product.id,
      productName: product.brand ? `${product.brand} ${product.name}` : product.name,
      eventType: 'CART_ADD',
      promotionId: meta?.promotionId,
      promotionName: meta?.promotionName,
    })
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.product.id !== productId))
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i)),
    )
  }

  function clear() {
    setItems([])
    setAppliedCoupon(null)
  }

  function applyCoupon() {
    const result = validateCoupon(couponInput, coupons)
    if (!result.valid) {
      setCouponError(couponErrorMessage(result.error))
      return
    }
    setAppliedCoupon(result.coupon)
    setCouponInput('')
    setCouponError(null)
  }

  function removeCoupon() {
    setAppliedCoupon(null)
    setCouponError(null)
  }

  // Subtotal sem desconto
  const subtotal = items.reduce(
    (sum, { product, quantity }) => sum + product.price * quantity,
    0,
  )

  // Calcula o desconto do cupom sobre os produtos elegíveis
  let discount = 0
  if (appliedCoupon) {
    const eligible = items.filter(
      ({ product }) =>
        !appliedCoupon.productIds?.length ||
        appliedCoupon.productIds.includes(product.id),
    )
    const eligibleTotal = eligible.reduce(
      (sum, { product, quantity }) => sum + product.price * quantity,
      0,
    )

    if (appliedCoupon.discountType === 'percentage' && appliedCoupon.discountPercent) {
      discount = Math.round(eligibleTotal * (appliedCoupon.discountPercent / 100) * 100) / 100
    } else if (appliedCoupon.discountType === 'fixed' && appliedCoupon.discountValue) {
      discount = Math.min(appliedCoupon.discountValue, eligibleTotal)
    }
  }

  const total = Math.max(0, subtotal - discount)
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <BagContext.Provider
      value={{
        items, totalItems, addItem, removeItem, updateQuantity, clear,
        appliedCoupon, couponInput, setCouponInput, couponError, applyCoupon, removeCoupon,
        subtotal, discount, total,
      }}
    >
      {children}
    </BagContext.Provider>
  )
}

export function useBag() {
  const ctx = useContext(BagContext)
  if (!ctx) throw new Error('useBag deve ser usado dentro de BagProvider')
  return ctx
}
