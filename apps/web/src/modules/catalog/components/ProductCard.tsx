'use client'

// Cartão de produto — dois formatos: grade (vertical) e lista (horizontal)
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Heart, Link, Check, ImageOff } from 'lucide-react'
import type { Product, DisplayMode, PromotionType } from '@esqueleton/shared'
import { ProductPrice } from './ProductPrice'
import { useBag } from '@/modules/bag/contexts/bag-context'
import { useFavorites } from '@/modules/favorites/contexts/favorites-context'
import { analyticsService } from '@/modules/analytics/services/analytics.service'
import { useStoreSlug } from '@/shared/hooks/useStoreSlug'

interface ProductCardProps {
  product: Product
  displayMode?: DisplayMode
  // Texto da tag exibida na borda colorida (ex: "Oferta", "Compre 2 Leve 3")
  badge?: string
  // Cor hexadecimal da borda de promoção (ex: "#f97316")
  badgeColor?: string
  // Promoção ativa — passada para o evento de analytics ao adicionar à sacola
  promotionId?: string
  promotionName?: string
  // Preço original antes da promoção — exibido riscado ao lado do preço atual
  originalPrice?: number
  // Percentual de desconto da promoção — exibido como tag (ex: "-20%")
  discountPercent?: number
  // Seção em destaque de origem — quando o card é exibido dentro de um destaque
  featuredId?: string
  featuredName?: string
  // Metadata da promoção — texto explicativo exibido abaixo do badge
  promotionDescription?: string
  promotionType?: PromotionType
  promotionProductIds?: string[]
  buyQuantity?: number
  getQuantity?: number
  kitPrice?: number
}

export function ProductCard({ product, displayMode = 'grid', badge, badgeColor, promotionId, promotionName, originalPrice, discountPercent, featuredId, featuredName, promotionDescription, promotionType, promotionProductIds, buyQuantity, getQuantity, kitPrice }: ProductCardProps) {
  const { addItem } = useBag()
  const { isFavorited, toggleFavorite } = useFavorites()
  const router = useRouter()
  const slug = useStoreSlug()
  const favorited = isFavorited(product.id)

  function goToDetail() {
    // Registra o clique vindo de destaque antes de navegar
    if (featuredId && featuredName) {
      analyticsService.recordEvent(slug, {
        productId: product.id,
        productName: product.brand ? `${product.brand} ${product.name}` : product.name,
        eventType: 'FEATURED_CLICK',
        featuredId,
        featuredName,
      })
    }
    router.push(`/loja/${slug}/produto/${product.id}`)
  }

  function handleAddToBag() {
    // Produtos com variantes exigem seleção de opções — redireciona para a página de detalhe
    if (product.variants && product.variants.length > 0) {
      router.push(`/loja/${slug}/produto/${product.id}`)
      return
    }
    addItem(product, { promotionId, promotionName, featuredId, featuredName })
  }

  // Texto explicativo da promoção — prioriza description do admin, senão gera automático pelo tipo
  const promoHint = getPromoHint(promotionDescription, promotionType, buyQuantity, getQuantity, kitPrice, promotionProductIds)

  if (displayMode === 'list') {
    return <ProductCardList product={product} badge={badge} badgeColor={badgeColor} originalPrice={originalPrice} discountPercent={discountPercent} promoHint={promoHint} favorited={favorited} onFavorite={() => toggleFavorite(product)} onCardClick={goToDetail} onAddToBag={handleAddToBag} />
  }

  return <ProductCardGrid product={product} badge={badge} badgeColor={badgeColor} originalPrice={originalPrice} discountPercent={discountPercent} promoHint={promoHint} favorited={favorited} onFavorite={() => toggleFavorite(product)} onCardClick={goToDetail} onAddToBag={handleAddToBag} />
}

// ── Formato grade ───────────────────────────────────────────────────────────

// Gera texto explicativo da promoção — prioriza o que o admin escreveu, senão monta automático
function getPromoHint(
  description?: string,
  type?: PromotionType,
  buyQty?: number,
  getQty?: number,
  kitPriceValue?: number,
  productIds?: string[],
): string | undefined {
  if (description) return description
  if (!type) return undefined

  if (type === 'buy_x_get_y' && buyQty && getQty) {
    const freeQty = getQty - buyQty
    return `Adicione ${getQty} unidades e pague apenas ${buyQty}${freeQty === 1 ? ' — 1 sai grátis!' : ` — ${freeQty} saem grátis!`}`
  }

  if (type === 'kit' && kitPriceValue && productIds && productIds.length > 0) {
    const formatted = kitPriceValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    return `Kit com ${productIds.length} produtos por ${formatted}`
  }

  return undefined
}

interface CardProps {
  product: Product
  badge?: string
  badgeColor?: string
  originalPrice?: number
  discountPercent?: number
  promoHint?: string
  favorited: boolean
  onFavorite: () => void
  onCardClick: () => void
  onAddToBag: () => void
}

function ProductCardGrid({ product, badge, badgeColor, originalPrice, discountPercent, promoHint, favorited, onFavorite, onCardClick, onAddToBag }: CardProps) {
  const hasPromo = !!(badge && badgeColor)

  return (
    // Wrapper com espaço fixo no topo — mesmo sem badge, para manter todos os cards alinhados
    <div className="relative" style={{ paddingTop: '13px' }}>

      {/* Badge posicionado sobre a borda superior do card */}
      {hasPromo && (
        <span
          className="absolute left-1/2 top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-[3px] text-[11px] font-bold text-white shadow-sm"
          style={{ backgroundColor: badgeColor }}
        >
          {badge}
        </span>
      )}

      <div
        onClick={onCardClick}
        className="group flex cursor-pointer flex-col rounded-2xl bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        style={{ border: hasPromo ? `2px solid ${badgeColor}` : '2px solid transparent' }}
      >
        {/* Imagem */}
        <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-gray-50">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-300">
              <ImageOff size={32} strokeWidth={1} />
              <span className="text-[10px] text-gray-400">Sem imagem</span>
            </div>
          )}

          {/* Botão favoritar */}
          <button
            onClick={(e) => { e.stopPropagation(); onFavorite() }}
            aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            className={`absolute right-2 top-2 rounded-full p-1.5 shadow transition-all duration-200
              ${favorited ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500'}`}
          >
            <Heart size={14} fill={favorited ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Informações — padding reduzido quando há promoção */}
        <div className={`flex flex-1 flex-col gap-2 ${hasPromo ? 'p-2 sm:p-2.5' : 'p-3 sm:p-4'}`}>

          <div className="flex-1">
            {product.brand && (
              <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">
                {product.brand}
              </p>
            )}
            <h2 className="text-sm font-semibold leading-snug text-gray-900">
              {product.name}
            </h2>
            {promoHint && (
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-gray-500">
                {promoHint}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <ProductPrice price={product.price} size="sm" originalPrice={originalPrice} discountPercent={discountPercent} />
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <AddToCartButton onClick={onAddToBag} />
              <CopyLinkButton productId={product.id} productName={product.name} />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Formato lista ───────────────────────────────────────────────────────────

function ProductCardList({ product, badge, badgeColor, originalPrice, discountPercent, promoHint, favorited, onFavorite, onCardClick, onAddToBag }: CardProps) {
  const hasPromo = !!(badge && badgeColor)

  return (
    // Wrapper com espaço fixo no topo — mesmo sem badge, para manter todos os cards alinhados
    <div className="relative" style={{ paddingTop: '13px' }}>

      {/* Badge sobre a borda superior */}
      {hasPromo && (
        <span
          className="absolute left-4 top-0 z-10 whitespace-nowrap rounded-full px-3 py-[3px] text-[11px] font-bold text-white shadow-sm"
          style={{ backgroundColor: badgeColor }}
        >
          {badge}
        </span>
      )}

      <div
        onClick={onCardClick}
        className="group flex cursor-pointer gap-3 rounded-2xl bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md sm:p-4"
        style={{ border: hasPromo ? `2px solid ${badgeColor}` : '2px solid transparent' }}
      >
        {/* Imagem */}
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-50 sm:h-32 sm:w-32">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-300">
              <ImageOff size={24} strokeWidth={1} />
              <span className="text-[10px] text-gray-400">Sem imagem</span>
            </div>
          )}
        </div>

        {/* Informações */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {product.brand && (
                <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">
                  {product.brand}
                </p>
              )}
              <h2 className="truncate text-sm font-semibold text-gray-900">
                {product.name}
              </h2>
              {promoHint && (
                <p className="mt-0.5 line-clamp-1 text-[11px] leading-tight text-gray-500">
                  {promoHint}
                </p>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onFavorite() }}
              aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              className={`shrink-0 rounded-full p-1.5 transition-colors ${
                favorited ? 'text-red-500' : 'text-gray-300 hover:text-red-400'
              }`}
            >
              <Heart size={15} fill={favorited ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <ProductPrice price={product.price} size="sm" originalPrice={originalPrice} discountPercent={discountPercent} />
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <AddToCartButton onClick={onAddToBag} large />
              <CopyLinkButton productId={product.id} productName={product.name} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Botão adicionar à sacola ────────────────────────────────────────────────

function AddToCartButton({ onClick, large }: { onClick: () => void; large?: boolean }) {
  const [added, setAdded] = useState(false)

  function handleClick() {
    onClick()
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); handleClick() }}
      aria-label="Adicionar à sacola"
      style={added ? {} : { backgroundColor: 'var(--color-primary, #000000)' }}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl font-semibold transition-all active:scale-95 ${large ? 'py-2.5 px-4 text-sm' : 'py-2 text-xs'} ${
        added ? 'bg-green-600 text-white' : 'text-white'
      }`}
    >
      {added ? <Check size={large ? 15 : 13} /> : <ShoppingBag size={large ? 15 : 13} />}
      {added ? 'Adicionado!' : 'Adicionar'}
    </button>
  )
}

// ── Botão copiar link do produto ────────────────────────────────────────────

function CopyLinkButton({ productId, productName }: { productId: string; productName: string }) {
  const [copied, setCopied] = useState(false)
  const slug = useStoreSlug()

  async function handleCopy() {
    const url = `${window.location.origin}/loja/${slug}/produto/${productId}`
    await navigator.clipboard.writeText(url)

    // Registra o evento de cópia de link para analytics (fire-and-forget)
    analyticsService.recordEvent(slug, { productId, productName, eventType: 'LINK_COPY' })

    // Mostra o ícone de confirmação por 2 segundos e volta ao normal
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="Copiar link do produto"
      title={copied ? 'Link copiado!' : 'Copiar link'}
      className={`flex shrink-0 items-center justify-center rounded-xl border px-2.5 py-2 transition-all duration-200 active:scale-95 ${
        copied
          ? 'border-green-200 bg-green-50 text-green-600'
          : 'border-gray-200 bg-white text-gray-400 hover:border-gray-400 hover:text-gray-600'
      }`}
    >
      {copied ? <Check size={14} /> : <Link size={14} />}
    </button>
  )
}
