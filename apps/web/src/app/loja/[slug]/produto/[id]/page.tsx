'use client'

// Página de detalhe do produto
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ShoppingBag, Heart, Link, Check, ArrowLeft, PackageSearch, ChevronLeft, ChevronRight } from 'lucide-react'
import { catalogService } from '@/services/catalog.service'
import { promotionsService } from '@/services/promotions.service'
import { MOCK_PRODUCTS } from '@/mocks/products'
import { MOCK_PROMOTIONS } from '@/mocks/promotions'
import { getActivePromotionForProduct, applyPromotionToProduct } from '@/utils/promotions'
import { ProductPrice } from '@/components/catalog/ProductPrice'
import { useBag } from '@/contexts/bag-context'
import { useFavorites } from '@/contexts/favorites-context'
import { analyticsService } from '@/services/analytics.service'
import { useStoreSlug } from '@/hooks/useStoreSlug'
import type { Product, ProductVariant, Promotion } from '@esqueleton/shared'

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

export default function ProductDetailPage() {
  // slug identifica a loja visitada; id identifica o produto
  const { slug, id } = useParams<{ slug: string; id: string }>()
  const router = useRouter()
  const { addItem } = useBag()
  const { isFavorited, toggleFavorite } = useFavorites()

  const [product, setProduct] = useState<Product | null>(null)
  // Preço original do produto (antes de aplicar promoção) — usado para calcular
  // o desconto proporcional nas variantes e exibir preço riscado
  const [rawPrice, setRawPrice] = useState<number | null>(null)
  // Percentual de desconto da promoção ativa — exibido como tag (ex: "-20%")
  const [promoDiscountPercent, setPromoDiscountPercent] = useState<number | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
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

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href)

    // Registra o evento de cópia de link para analytics (fire-and-forget)
    if (product) {
      analyticsService.recordEvent(slug, { productId: product.id, productName: product.name, eventType: 'LINK_COPY' })
    }

    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }


  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-8">

        {/* Botão voltar */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Voltar ao catálogo
        </button>

        {/* Estado de carregamento */}
        {isLoading && <ProductDetailSkeleton />}

        {/* Produto não encontrado */}
        {!isLoading && !product && <ProductNotFound />}

        {/* Conteúdo do produto */}
        {!isLoading && product && (() => {
          // Monta a galeria de fotos: imagem principal + adicionais + imagem da variante selecionada
          const allImages: string[] = []
          if (product.imageUrl) allImages.push(product.imageUrl)
          if (product.images) allImages.push(...product.images)

          // Variante selecionada (se todas as opções foram escolhidas)
          const activeVariants = (product.variants ?? []).filter((v) => v.active)
          const optionGroups = getOptionGroups(activeVariants)
          const selectedVariant = findVariant(activeVariants, selectedOptions)

          // Verifica se há promoção aplicada ao produto (preço original maior que o preço atual)
          const hasPromo = rawPrice !== null && rawPrice > product.price

          // Preço da variante selecionada — quando há promoção, aplica o mesmo desconto
          // proporcional ao preço da variante (ex: promoção de 20% → variant.price * 0.8)
          let displayPrice = product.price
          if (selectedVariant) {
            if (hasPromo) {
              const discountRate = product.price / rawPrice
              displayPrice = Math.round(selectedVariant.price * discountRate * 100) / 100
            } else {
              displayPrice = selectedVariant.price
            }
          }

          // Se a variante tem imagem, mostra como principal
          const variantImage = selectedVariant?.imageUrl
          const galleryImages = variantImage ? [variantImage, ...allImages.filter((i) => i !== variantImage)] : allImages

          return (
            <div className="grid gap-8 lg:grid-cols-2">

              {/* Coluna esquerda — galeria de fotos */}
              <div>
                {/* Imagem principal */}
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
                  {galleryImages.length > 0 ? (
                    <>
                      <img
                        src={galleryImages[currentImageIndex] ?? galleryImages[0]}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                      {/* Setas de navegação */}
                      {galleryImages.length > 1 && (
                        <>
                          <button
                            onClick={() => setCurrentImageIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white transition-colors hover:bg-black/60"
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <button
                            onClick={() => setCurrentImageIndex((i) => (i + 1) % galleryImages.length)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white transition-colors hover:bg-black/60"
                          >
                            <ChevronRight size={20} />
                          </button>
                          {/* Indicadores */}
                          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                            {galleryImages.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={() => setCurrentImageIndex(idx)}
                                className={`h-2 w-2 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-200">
                      <ShoppingBag size={80} strokeWidth={1} />
                    </div>
                  )}
                </div>

                {/* Miniaturas */}
                {galleryImages.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {galleryImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                          idx === currentImageIndex ? 'border-gray-900' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Coluna direita — informações */}
              <div className="flex flex-col gap-6">

                {/* Marca e nome */}
                <div>
                  {product.brand && (
                    <p className="text-sm font-medium uppercase tracking-widest text-gray-400">
                      {product.brand}
                    </p>
                  )}
                  <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
                    {product.name}
                  </h1>
                </div>

                {/* Preço */}
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <ProductPrice
                    price={displayPrice}
                    size="lg"
                    originalPrice={hasPromo ? (selectedVariant ? selectedVariant.price : rawPrice ?? undefined) : undefined}
                    discountPercent={hasPromo ? promoDiscountPercent : undefined}
                  />
                </div>

                {/* Seletor de variantes */}
                {optionGroups.length > 0 && (
                  <div className="flex flex-col gap-4">
                    {optionGroups.map(({ name, values }) => (
                      <div key={name}>
                        <p className="mb-2 text-sm font-medium text-gray-700">
                          {name}{selectedOptions[name] ? `: ${selectedOptions[name]}` : ''}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {values.map((value) => {
                            const isSelected = selectedOptions[name] === value
                            return (
                              <button
                                key={value}
                                onClick={() => {
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
                                }}
                                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                                  isSelected
                                    ? 'border-gray-900 bg-gray-900 text-white'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                                }`}
                              >
                                {value}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botões de ação */}
                <div className="flex flex-col gap-3">

                  {/* Adicionar à sacola */}
                  <button
                    onClick={() => {
                      if (!product) return
                      const hasOptions = Object.keys(selectedOptions).length > 0
                      addItem(product, hasOptions ? { selectedOptions, variantId: selectedVariant?.id } : undefined)
                      setAdded(true)
                      setTimeout(() => setAdded(false), 1500)
                    }}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all active:scale-95 ${
                      added
                        ? 'bg-green-600 text-white'
                        : 'bg-black text-white hover:bg-gray-800'
                    }`}
                  >
                    {added ? (
                      <><Check size={17} /> Adicionado!</>
                    ) : (
                      <><ShoppingBag size={17} /> Adicionar à sacola</>
                    )}
                  </button>

                  {/* Favoritar e copiar link */}
                  <div className="flex gap-3">
                    {product && (() => {
                      const fav = isFavorited(product.id)
                      return (
                        <button
                          onClick={() => toggleFavorite(product)}
                          aria-label={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all active:scale-95 ${
                            fav
                              ? 'border-red-200 bg-red-50 text-red-500'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          <Heart size={16} fill={fav ? 'currentColor' : 'none'} />
                          {fav ? 'Favoritado' : 'Favoritar'}
                        </button>
                      )
                    })()}

                    <button
                      onClick={handleCopyLink}
                      aria-label="Copiar link"
                      title={copied ? 'Link copiado!' : 'Copiar link'}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all active:scale-95 ${
                        copied
                          ? 'border-green-200 bg-green-50 text-green-600'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {copied ? <Check size={16} /> : <Link size={16} />}
                      {copied ? 'Link copiado!' : 'Copiar link'}
                    </button>
                  </div>
                </div>

                {/* Características */}
                {product.characteristics && product.characteristics.length > 0 && (
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">Características</h2>
                    <dl className="divide-y divide-gray-100">
                      {product.characteristics.map((char, index) => (
                        <div key={index} className="flex justify-between py-2 text-sm">
                          <dt className="text-gray-500">{char.name}</dt>
                          <dd className="font-medium text-gray-900">{char.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {/* Descrição */}
                {product.description && (
                  <p className="leading-relaxed text-gray-500">{product.description}</p>
                )}

                {/* Data de cadastro */}
                <p className="text-xs text-gray-400">
                  Cadastrado em{' '}
                  {new Date(product.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>

              </div>
            </div>
          )
        })()}

      </div>
    </main>
  )
}

// Esqueleto de carregamento
function ProductDetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="aspect-square animate-pulse rounded-2xl bg-gray-200" />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="h-8 w-3/4 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-24 animate-pulse rounded-xl bg-gray-200" />
        <div className="flex flex-col gap-3">
          <div className="h-12 animate-pulse rounded-xl bg-gray-200" />
          <div className="flex gap-3">
            <div className="h-12 flex-1 animate-pulse rounded-xl bg-gray-200" />
            <div className="h-12 flex-1 animate-pulse rounded-xl bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Produto não encontrado
function ProductNotFound() {
  const router = useRouter()
  const slug = useStoreSlug()
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-gray-400">
      <PackageSearch size={48} strokeWidth={1.5} />
      <p className="text-lg font-medium text-gray-600">Produto não encontrado</p>
      <p className="text-sm">Este produto não existe ou foi removido.</p>
      <button
        onClick={() => router.push(`/loja/${slug}`)}
        className="mt-2 rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
      >
        Voltar ao catálogo
      </button>
    </div>
  )
}
