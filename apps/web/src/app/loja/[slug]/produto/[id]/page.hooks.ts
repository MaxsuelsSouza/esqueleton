'use client'

// Hook que concentra toda a lógica de estado e efeitos da página de detalhe do produto
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { catalogService } from '@/modules/catalog/services/catalog.service'
import { promotionsService } from '@/modules/promotions/services/promotions.service'
import { MOCK_PRODUCTS } from '@/modules/catalog/mocks/products'
import { MOCK_PROMOTIONS } from '@/modules/promotions/mocks/promotions'
import { getActivePromotionForProduct, applyPromotionToProduct } from '@/modules/promotions/utils/promotions'
import { useBag } from '@/modules/bag/contexts/bag-context'
import { useFavorites } from '@/modules/favorites/contexts/favorites-context'
import { useCustomer } from '@/modules/customers/contexts/customer-context'
import { useStoreProfile } from '@/modules/store-profile/contexts/store-profile-context'
import { customersService } from '@/modules/customers/services/customers.service'
import { analyticsService } from '@/modules/analytics/services/analytics.service'
import { useStoreSlug } from '@/shared/hooks/useStoreSlug'
import type { Product, ProductVariant, Promotion } from '@esqueleton/shared'

// Quantidade mínima de sugestões exibidas — se a categoria não tiver o suficiente,
// complementa com produtos gerais da loja
const MIN_SUGGESTIONS = 10

// Troque para false quando a API estiver pronta
const USE_MOCK_DATA = false

// Chave usada no localStorage para guardar quais produtos foram vistos e em qual data
const STORAGE_KEY = 'esqueleton_produtos_vistos'

// Retorna true se o produto já foi visto hoje neste navegador
function jaViuHoje(productId: string): boolean {
  try {
    const hoje = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
    const registros: Record<string, string> = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return registros[productId] === hoje
  } catch {
    return false
  }
}

// Salva a data de hoje para o produto, para não contar novamente no mesmo dia
function marcarComoVisto(productId: string): void {
  try {
    const hoje = new Date().toISOString().slice(0, 10)
    const registros: Record<string, string> = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    registros[productId] = hoje
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registros))
  } catch {
    // localStorage pode estar bloqueado em alguns navegadores — ignora silenciosamente
  }
}

// Extrai os grupos de opções (ex: "Cor" → ["Branco", "Azul"]) das variantes ativas
function getOptionGroups(variants: ProductVariant[]): { name: string; values: string[] }[] {
  const groups = new Map<string, Set<string>>()
  for (const variant of variants) {
    for (const [key, value] of Object.entries(variant.options)) {
      if (!groups.has(key)) groups.set(key, new Set())
      groups.get(key)!.add(value)
    }
  }
  return Array.from(groups.entries()).map(([name, values]) => ({
    name,
    values: Array.from(values),
  }))
}

// Encontra a variante que corresponde às opções selecionadas pelo cliente
function findVariant(
  variants: ProductVariant[],
  selectedOptions: Record<string, string>,
): ProductVariant | undefined {
  const selectedKeys = Object.keys(selectedOptions)
  if (selectedKeys.length === 0) return undefined
  return variants.find((v) =>
    selectedKeys.every((key) => v.options[key] === selectedOptions[key]),
  )
}

export function useProdutoDetailPage() {
  // slug identifica a loja visitada; id identifica o produto
  const { slug, id } = useParams<{ slug: string; id: string }>()
  const router = useRouter()
  const { addItem } = useBag()
  const { isFavorited, toggleFavorite } = useFavorites()
  const { customer, setCustomer } = useCustomer()
  const { profile } = useStoreProfile()

  const [product, setProduct] = useState<Product | null>(null)
  // Preço original do produto (antes de aplicar promoção) — usado para calcular
  // o desconto proporcional nas variantes e exibir preço riscado
  const [rawPrice, setRawPrice] = useState<number | null>(null)
  // Percentual de desconto da promoção ativa — exibido como tag (ex: "-20%")
  const [promoDiscountPercent, setPromoDiscountPercent] = useState<number | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  // Produtos sugeridos (mesma categoria do produto atual)
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [added, setAdded] = useState(false)

  // Galeria de fotos — índice da imagem atualmente visível
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Variante selecionada — opções escolhidas pelo cliente
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})

  useEffect(() => {
    if (USE_MOCK_DATA) {
      const found = MOCK_PRODUCTS.find((p) => p.id === id) ?? null
      if (found) {
        setRawPrice(found.price)
        // Aplica promoção ativa ao produto, se houver
        const promo = getActivePromotionForProduct(found.id, MOCK_PROMOTIONS)
        if (promo) {
          const result = applyPromotionToProduct(found, promo)
          setProduct(result.product)
          setPromoDiscountPercent(result.discountPercent)
        } else {
          setProduct(found)
          setPromoDiscountPercent(undefined)
        }
      } else {
        setProduct(null)
      }
      setIsLoading(false)
      return
    }

    // cancelled evita duplo registro no StrictMode (React monta o componente duas vezes em desenvolvimento)
    let cancelled = false

    Promise.all([
      catalogService.getPublicProduct(slug, id),
      promotionsService.listPublicPromotions(slug).catch(() => [] as Promotion[]),
    ])
      .then(([p, promotions]) => {
        setRawPrice(p.price)
        // Aplica promoção ativa ao produto, se houver
        const promo = getActivePromotionForProduct(p.id, promotions)
        if (promo) {
          const result = applyPromotionToProduct(p, promo)
          setProduct(result.product)
          setPromoDiscountPercent(result.discountPercent)
        } else {
          setProduct(p)
          setPromoDiscountPercent(undefined)
        }
        // Registra a visualização apenas se este efeito ainda for o atual
        // e se o produto ainda não foi visto hoje (evita contar múltiplas vezes no mesmo dia)
        if (!cancelled && !jaViuHoje(p.id)) {
          marcarComoVisto(p.id)
          analyticsService.recordEvent(slug, {
            productId: p.id,
            productName: p.brand ? `${p.brand} ${p.name}` : p.name,
            eventType: 'PRODUCT_VIEW',
          })
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setIsLoading(false))

    return () => { cancelled = true }
  }, [slug, id])

  // Busca sugestões de produtos da mesma categoria — se não houver o suficiente,
  // complementa com produtos gerais da loja até atingir o mínimo
  useEffect(() => {
    if (!product) {
      setSuggestions([])
      return
    }

    let cancelled = false
    setSuggestionsLoading(true)

    async function fetchSuggestions() {
      const exclude = product!.id
      let results: Product[] = []

      // 1. Busca por categoria (se o produto tiver categorias)
      if (product!.categoryIds && product!.categoryIds.length > 0) {
        try {
          const byCategory = await catalogService.listPublicProducts(slug, {
            categoryIds: product!.categoryIds.join(','),
            pageSize: MIN_SUGGESTIONS + 1,
          })
          results = byCategory.data.filter((p) => p.id !== exclude)
        } catch {
          // ignora erro — tenta complementar com produtos gerais
        }
      }

      // 2. Se não atingiu o mínimo, complementa com produtos gerais da loja
      if (results.length < MIN_SUGGESTIONS) {
        try {
          const general = await catalogService.listPublicProducts(slug, {
            pageSize: MIN_SUGGESTIONS + 1 - results.length,
          })
          const existingIds = new Set([exclude, ...results.map((p) => p.id)])
          const extras = general.data.filter((p) => !existingIds.has(p.id))
          results = [...results, ...extras]
        } catch {
          // mantém o que já tem
        }
      }

      if (!cancelled) {
        setSuggestions(results.slice(0, MIN_SUGGESTIONS))
        setSuggestionsLoading(false)
      }
    }

    fetchSuggestions()
    return () => { cancelled = true }
  }, [slug, product?.id, product?.categoryIds?.join(',')])

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href)

    // Registra o evento de cópia de link para analytics (fire-and-forget)
    if (product) {
      analyticsService.recordEvent(slug, { productId: product.id, productName: product.name, eventType: 'LINK_COPY' })
    }

    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Monta a galeria de fotos: imagem principal + adicionais + imagem da variante selecionada
  const allImages: string[] = []
  if (product?.imageUrl) allImages.push(product.imageUrl)
  if (product?.images) allImages.push(...product.images)

  // Variante selecionada (se todas as opções foram escolhidas)
  const activeVariants = (product?.variants ?? []).filter((v) => v.active)
  const optionGroups = getOptionGroups(activeVariants)
  const selectedVariant = findVariant(activeVariants, selectedOptions)

  // Verifica se há promoção aplicada ao produto (preço original maior que o preço atual)
  const hasPromo = product !== null && rawPrice !== null && rawPrice > product.price

  // Preço da variante selecionada — quando há promoção, aplica o mesmo desconto
  // proporcional ao preço da variante (ex: promoção de 20% → variant.price * 0.8)
  let displayPrice = product?.price ?? 0
  if (selectedVariant && product) {
    if (hasPromo && rawPrice !== null) {
      const discountRate = product.price / rawPrice
      displayPrice = Math.round(selectedVariant.price * discountRate * 100) / 100
    } else {
      displayPrice = selectedVariant.price
    }
  }

  // Se a variante tem imagem, mostra como principal
  const variantImage = selectedVariant?.imageUrl
  const galleryImages = variantImage ? [variantImage, ...allImages.filter((i) => i !== variantImage)] : allImages

  function handleSelectOption(name: string, value: string, isSelected: boolean) {
    setSelectedOptions((prev) => {
      const next = { ...prev }
      if (isSelected) {
        delete next[name]
      } else {
        next[name] = value
      }
      return next
    })
    setCurrentImageIndex(0)
    setVariantError(null)
  }

  // Erro exibido quando o cliente tenta adicionar sem selecionar todas as variantes
  const [variantError, setVariantError] = useState<string | null>(null)

  function handleAddToBag() {
    if (!product) return

    // Se o produto tem variantes, exige que todas as opções estejam selecionadas
    if (optionGroups.length > 0) {
      const missing = optionGroups.filter((g) => !selectedOptions[g.name])
      if (missing.length > 0) {
        setVariantError(`Selecione: ${missing.map((g) => g.name).join(', ')}`)
        return
      }
    }

    setVariantError(null)
    const hasOptions = Object.keys(selectedOptions).length > 0
    addItem(product, hasOptions ? { selectedOptions, variantId: selectedVariant?.id } : undefined)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  // ── Comprar agora (WhatsApp direto) ──────────────────────────────────────

  // Modal de identificação do cliente
  const [identModalOpen, setIdentModalOpen] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [identError, setIdentError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  function formatBRL(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Monta a mensagem do produto para o WhatsApp
  function buildBuyNowMessage(customerInfo: { name: string; phone: string }) {
    if (!product) return ''
    const name = product.brand ? `${product.brand} ${product.name}` : product.name
    const optionsText = Object.keys(selectedOptions).length > 0
      ? ' — ' + Object.values(selectedOptions).join(' · ')
      : ''
    const lines: string[] = []
    lines.push(`Olá! Tenho interesse neste produto:`)
    lines.push('')
    lines.push(`🛍️ *${name}${optionsText}*`)
    lines.push(`💵 ${formatBRL(displayPrice)}`)
    if (hasPromo && rawPrice) {
      lines.push(`🏷️ De ~${formatBRL(selectedVariant ? selectedVariant.price : rawPrice)}~`)
    }
    lines.push('')
    lines.push(`👤 *${customerInfo.name}*`)
    lines.push(`📞 ${customerInfo.phone}`)
    return lines.join('\n')
  }

  // Abre o WhatsApp com a mensagem do produto
  function goToWhatsAppBuyNow(customerInfo: { name: string; phone: string }) {
    const whatsappNumber = profile.whatsapp ?? ''
    if (!whatsappNumber) {
      alert('Esta loja ainda não configurou o WhatsApp.')
      return
    }

    const message = encodeURIComponent(buildBuyNowMessage(customerInfo))
    const url = `https://wa.me/${whatsappNumber}?text=${message}`
    window.open(url, '_blank')

    // Registra analytics — fire and forget
    if (product) {
      analyticsService.recordEvent(slug, {
        productId: product.id,
        productName: product.brand ? `${product.brand} ${product.name}` : product.name,
        eventType: 'WHATSAPP_SEND',
      })
    }
  }

  // Clique no botão "Comprar agora" — se já identificado, vai direto; senão, abre o modal
  function handleBuyNow() {
    if (!product) return
    if (customer) {
      goToWhatsAppBuyNow(customer)
    } else {
      setNameInput('')
      setPhoneInput('')
      setIdentError(null)
      setIdentModalOpen(true)
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }

  // Confirmação do modal — salva cliente e abre WhatsApp
  function handleIdentConfirm() {
    const name = nameInput.trim()
    const phone = phoneInput.trim()

    if (!name) { setIdentError('Informe seu nome.'); return }
    const digits = phone.replace(/\D/g, '')
    if (!/^\d{10,11}$/.test(digits)) { setIdentError('Informe um telefone válido com DDD.'); return }

    const info = { name, phone }
    setCustomer(info)
    setIdentModalOpen(false)
    goToWhatsAppBuyNow(info)

    // Salva no banco da loja em paralelo — fire and forget
    customersService.upsert(slug, name, phone)
  }

  function closeIdentModal() {
    setIdentModalOpen(false)
  }

  function handleModalBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) setIdentModalOpen(false)
  }

  return {
    product,
    rawPrice,
    promoDiscountPercent,
    isLoading,
    copied,
    added,
    currentImageIndex,
    setCurrentImageIndex,
    selectedOptions,
    router,
    slug,
    isFavorited,
    toggleFavorite,
    handleCopyLink,
    handleAddToBag,
    handleSelectOption,
    variantError,
    galleryImages,
    optionGroups,
    selectedVariant,
    hasPromo,
    displayPrice,
    suggestions,
    suggestionsLoading,
    // Comprar agora
    handleBuyNow,
    identModalOpen,
    nameInput,
    setNameInput,
    phoneInput,
    setPhoneInput,
    identError,
    nameRef,
    handleIdentConfirm,
    closeIdentModal,
    handleModalBackdropClick,
  }
}
