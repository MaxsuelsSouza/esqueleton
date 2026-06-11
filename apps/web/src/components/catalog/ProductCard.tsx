'use client'

// Cartão de produto — dois formatos: grade (vertical) e lista (horizontal)
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Heart, Link, Check } from 'lucide-react'
import type { Product, DisplayMode } from '@esqueleton/shared'
import { ProductPrice } from './ProductPrice'
import { useBag } from '@/contexts/bag-context'
import { useFavorites } from '@/contexts/favorites-context'
import { analyticsService } from '@/services/analytics.service'
import { useStoreSlug } from '@/hooks/useStoreSlug'

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
  // Seção em destaque de origem — quando o card é exibido dentro de um destaque
  featuredId?: string
  featuredName?: string
}

export function ProductCard({ product, displayMode = 'grid', badge, badgeColor, promotionId, promotionName, featuredId, featuredName }: ProductCardProps) {
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
    addItem(product, { promotionId, promotionName, featuredId, featuredName })
  }

  if (displayMode === 'list') {
    return <ProductCardList product={product} badge={badge} badgeColor={badgeColor} favorited={favorited} onFavorite={() => toggleFavorite(product)} onCardClick={goToDetail} onAddToBag={handleAddToBag} />
  }

  return <ProductCardGrid product={product} badge={badge} badgeColor={badgeColor} favorited={favorited} onFavorite={() => toggleFavorite(product)} onCardClick={goToDetail} onAddToBag={handleAddToBag} />
}

// ── Formato grade ───────────────────────────────────────────────────────────

interface CardProps {
  product: Product
  badge?: string
  badgeColor?: string
  favorited: boolean
  onFavorite: () => void
  onCardClick: () => void
  onAddToBag: () => void
}

function ProductCardGrid({ product, badge, badgeColor, favorited, onFavorite, onCardClick, onAddToBag }: CardProps) {
  const hasPromo = !!(badge && badgeColor)

  return (
    // Wrapper relativo com espaço no topo para o badge flutuar sobre a borda
    <div className="relative" style={hasPromo ? { paddingTop: '13px' } : {}}>

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
        className="group flex flex-col rounded-2xl bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        style={hasPromo
          ? { border: `2px solid ${badgeColor}` }
          : { border: '1px solid rgb(243 244 246)' }
        }
      >
        {/* Imagem */}
        <div
          onClick={onCardClick}
          className="relative aspect-square cursor-pointer overflow-hidden rounded-t-2xl bg-gray-50"
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-200">
              <ShoppingBag size={48} strokeWidth={1} />
            </div>
          )}

          {/* Botão favoritar */}
          <button
            onClick={onFavorite}
            aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            className={`absolute right-2 top-2 rounded-full p-1.5 shadow transition-all duration-200
              ${favorited ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500'}`}
          >
            <Heart size={14} fill={favorited ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Informações — padding reduzido quando há promoção */}
        <div className={`flex flex-1 flex-col gap-2 ${hasPromo ? 'p-2 sm:p-2.5' : 'p-3 sm:p-4'}`}>

          <div className="flex-1 cursor-pointer" onClick={onCardClick}>
            {product.brand && (
              <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">
                {product.brand}
              </p>
            )}
            <h2 className="text-sm font-semibold leading-snug text-gray-900">
              {product.name}
            </h2>
          </div>

          <div className="flex flex-col gap-1.5">
            <ProductPrice price={product.price} originalPrice={product.originalPrice} size="sm" />
            <StockBadge stock={product.stock} />
            <div className="flex gap-2">
              <AddToCartButton onClick={onAddToBag} disabled={product.stock === 0} />
              <CopyLinkButton productId={product.id} productName={product.name} />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Formato lista ───────────────────────────────────────────────────────────

function ProductCardList({ product, badge, badgeColor, favorited, onFavorite, onCardClick, onAddToBag }: CardProps) {
  const hasPromo = !!(badge && badgeColor)

  return (
    <div className="relative" style={hasPromo ? { paddingTop: '13px' } : {}}>

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
        className="group flex gap-3 rounded-2xl bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md sm:p-4"
        style={hasPromo
          ? { border: `2px solid ${badgeColor}` }
          : { border: '1px solid rgb(243 244 246)' }
        }
      >
        {/* Imagem */}
        <div
          onClick={onCardClick}
          className="relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-gray-50 sm:h-32 sm:w-32"
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-200">
              <ShoppingBag size={32} strokeWidth={1} />
            </div>
          )}
        </div>

        {/* Informações */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 cursor-pointer" onClick={onCardClick}>
              {product.brand && (
                <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">
                  {product.brand}
                </p>
              )}
              <h2 className="truncate text-sm font-semibold text-gray-900">
                {product.name}
              </h2>
            </div>
            <button
              onClick={onFavorite}
              aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              className={`shrink-0 rounded-full p-1.5 transition-colors ${
                favorited ? 'text-red-500' : 'text-gray-300 hover:text-red-400'
              }`}
            >
              <Heart size={15} fill={favorited ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <ProductPrice price={product.price} originalPrice={product.originalPrice} size="sm" />
              <div className="flex gap-2">
                <AddToCartButton onClick={onAddToBag} disabled={product.stock === 0} large />
                <CopyLinkButton productId={product.id} productName={product.name} />
              </div>
            </div>
            <StockBadge stock={product.stock} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Badge de estoque baixo ──────────────────────────────────────────────────

function StockBadge({ stock }: { stock?: number | null }) {
  if (stock == null || stock >= 6) return null
  if (stock === 0) return (
    <span className="text-xs font-semibold text-red-500">Esgotado</span>
  )
  return (
    <span className="text-xs font-semibold text-orange-500">
      Restam {stock} {stock === 1 ? 'unidade' : 'unidades'}
    </span>
  )
}

// ── Botão adicionar à sacola ────────────────────────────────────────────────

function AddToCartButton({ onClick, disabled, large }: { onClick: () => void; disabled?: boolean; large?: boolean }) {
  const [added, setAdded] = useState(false)

  function handleClick() {
    onClick()
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  if (disabled) {
    return (
      <span className={`flex flex-1 items-center justify-center rounded-xl bg-gray-100 font-semibold text-gray-400 ${large ? 'py-2.5 px-4 text-sm' : 'py-2 text-xs'}`}>
        Esgotado
      </span>
    )
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
