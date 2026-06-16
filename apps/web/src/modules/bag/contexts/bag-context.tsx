'use client'

// Contexto global da sacola de compras — persiste os itens no servidor (Redis)
// em vez do localStorage, evitando consumo excessivo de memória do navegador.
//
// Os dados completos dos produtos (nome, preço, imagem) não são armazenados —
// apenas os IDs e quantidades. A página da sacola busca os produtos frescos do
// banco quando precisa renderizar.
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import type { Product, Coupon } from '@esqueleton/shared'
import { couponsService } from '@/modules/coupons/services/coupons.service'
import { analyticsService } from '@/modules/analytics/services/analytics.service'
import { sessionService, type CartApiItem } from '@/modules/session/services/session.service'
import { useStoreSlug } from '@/shared/hooks/useStoreSlug'

// Metadados opcionais que acompanham o produto ao ser adicionado à sacola
type AddItemMeta = {
  promotionId?: string
  promotionName?: string
  // Seção em destaque de onde o produto foi adicionado — para analytics
  featuredId?: string
  featuredName?: string
  // Opções da variante selecionada (ex: { Cor: "Preto", Armazenamento: "1TB" })
  selectedOptions?: Record<string, string>
  // ID da variante selecionada — usado para buscar o preço correto na sacola
  variantId?: string
}

interface BagContextValue {
  // Itens da sacola — apenas IDs e quantidades (sem dados completos do produto)
  cartItems: CartApiItem[]
  totalItems: number
  isLoading: boolean
  addItem: (product: Product, meta?: AddItemMeta) => void
  removeItem: (productId: string, selectedOptions?: Record<string, string>) => void
  updateQuantity: (productId: string, quantity: number, selectedOptions?: Record<string, string>) => void
  clear: () => void
  // Cupom aplicado na sacola
  appliedCoupon: Coupon | null
  couponInput: string
  setCouponInput: (v: string) => void
  couponError: string | null
  applyCoupon: () => void
  removeCoupon: () => void
}

const BagContext = createContext<BagContextValue | null>(null)

export function BagProvider({ children }: { children: React.ReactNode }) {
  const slug = useStoreSlug()

  const [cartItems, setCartItems] = useState<CartApiItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState<string | null>(null)

  // Ref para evitar sincronizar o estado inicial (vazio) de volta ao servidor
  const loaded = useRef(false)

  // Carrega a sacola do servidor ao montar (e ao trocar de loja).
  // Na primeira vez após a migração, verifica se há dados antigos no localStorage
  // e envia para o servidor — assim o visitante não perde a sacola que já tinha.
  useEffect(() => {
    if (!slug) return
    loaded.current = false
    setIsLoading(true)
    setAppliedCoupon(null)

    sessionService.getCart(slug)
      .then(async (items) => {
        // Se o servidor está vazio, tenta migrar dados antigos do localStorage
        if (items.length === 0) {
          try {
            const oldKey = `sacola:${slug}`
            const oldData = localStorage.getItem(oldKey)
            if (oldData) {
              const oldItems = JSON.parse(oldData) as Array<{ product: { id: string }; quantity: number; promotionId?: string; promotionName?: string }>
              if (oldItems.length > 0) {
                const migrated = oldItems.map((i) => ({
                  productId: i.product.id,
                  quantity: i.quantity,
                  promotionId: i.promotionId,
                  promotionName: i.promotionName,
                }))
                await sessionService.setCart(slug, migrated)
                items = migrated
              }
              localStorage.removeItem(oldKey)
            }
          } catch {}
        }
        setCartItems(items)
        loaded.current = true
      })
      .catch(() => {
        setCartItems([])
        loaded.current = true
      })
      .finally(() => setIsLoading(false))
  }, [slug])

  // Sincroniza com o servidor sempre que os itens mudam — pula o carregamento inicial
  const syncToServer = useCallback((items: CartApiItem[]) => {
    if (!slug || !loaded.current) return
    sessionService.setCart(slug, items)
  }, [slug])

  // Compara duas seleções de opções — true se têm as mesmas chaves e valores
  function sameOptions(a?: Record<string, string>, b?: Record<string, string>) {
    if (!a && !b) return true
    if (!a || !b) return false
    const keysA = Object.keys(a)
    if (keysA.length !== Object.keys(b).length) return false
    return keysA.every((k) => a[k] === b[k])
  }

  function addItem(product: Product, meta?: AddItemMeta) {
    setCartItems((prev) => {
      // Mesmo produto + mesmas opções = incrementa quantidade; opções diferentes = item novo
      const existing = prev.find(
        (i) => i.productId === product.id && sameOptions(i.selectedOptions, meta?.selectedOptions),
      )
      let next: CartApiItem[]
      if (existing) {
        next = prev.map((i) =>
          i.productId === product.id && sameOptions(i.selectedOptions, meta?.selectedOptions)
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        )
      } else {
        next = [...prev, {
          productId: product.id,
          quantity: 1,
          promotionId: meta?.promotionId,
          promotionName: meta?.promotionName,
          selectedOptions: meta?.selectedOptions,
          variantId: meta?.variantId,
        }]
      }
      syncToServer(next)
      return next
    })

    // Registra o evento de analytics — fire and forget
    analyticsService.recordEvent(slug, {
      productId: product.id,
      productName: product.brand ? `${product.brand} ${product.name}` : product.name,
      eventType: 'CART_ADD',
      promotionId: meta?.promotionId,
      promotionName: meta?.promotionName,
      featuredId: meta?.featuredId,
      featuredName: meta?.featuredName,
    })
  }

  function removeItem(productId: string, opts?: Record<string, string>) {
    setCartItems((prev) => {
      const next = prev.filter((i) => !(i.productId === productId && sameOptions(i.selectedOptions, opts)))
      syncToServer(next)
      return next
    })
  }

  function updateQuantity(productId: string, quantity: number, opts?: Record<string, string>) {
    if (quantity <= 0) {
      removeItem(productId, opts)
      return
    }
    setCartItems((prev) => {
      const next = prev.map((i) =>
        i.productId === productId && sameOptions(i.selectedOptions, opts) ? { ...i, quantity } : i,
      )
      syncToServer(next)
      return next
    })
  }

  function clear() {
    setCartItems([])
    setAppliedCoupon(null)
    if (slug) sessionService.clearCart(slug)
  }

  // Valida o código na API — o servidor confere se o cupom existe, está ativo
  // e dentro do prazo, e devolve apenas os dados necessários para o desconto
  async function applyCoupon() {
    const code = couponInput.trim()
    if (!code) {
      setCouponError('Digite um código de cupom.')
      return
    }
    try {
      const coupon = await couponsService.getPublicCouponByCode(slug, code)
      setAppliedCoupon(coupon)
      setCouponInput('')
      setCouponError(null)
    } catch (error) {
      setCouponError(error instanceof Error ? error.message : 'Cupom não encontrado.')
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null)
    setCouponError(null)
  }

  const totalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <BagContext.Provider
      value={{
        cartItems, totalItems, isLoading, addItem, removeItem, updateQuantity, clear,
        appliedCoupon, couponInput, setCouponInput, couponError, applyCoupon, removeCoupon,
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
