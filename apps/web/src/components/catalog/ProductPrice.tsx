// Exibição do preço do produto — mostra preço original riscado e badge de desconto quando há promoção
import { calcDiscount } from '@esqueleton/shared'

interface ProductPriceProps {
  price: number
  originalPrice?: number
  // 'sm' para cards | 'lg' para página de detalhe
  size?: 'sm' | 'lg'
}

export function ProductPrice({ price, originalPrice, size = 'sm' }: ProductPriceProps) {
  const hasDiscount = originalPrice !== undefined && originalPrice > price
  const discount = hasDiscount ? calcDiscount(price, originalPrice) : 0

  const formattedPrice = price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const formattedOriginal = originalPrice?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const priceClass = size === 'lg'
    ? 'text-3xl font-bold text-gray-900'
    : 'text-base font-bold text-gray-900 sm:text-lg'

  const originalClass = size === 'lg'
    ? 'text-sm text-gray-400 line-through'
    : 'text-xs text-gray-400 line-through'

  const badgeClass = size === 'lg'
    ? 'rounded-md bg-red-500 px-2 py-0.5 text-sm font-bold text-white'
    : 'rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white'

  return (
    <div className="flex flex-col gap-0.5">

      {/* Preço original riscado e porcentagem de desconto — só aparece quando uma promoção altera o preço */}
      {hasDiscount && (
        <div className="flex items-center gap-2">
          <span className={originalClass}>{formattedOriginal}</span>
          <span className={badgeClass}>-{discount}%</span>
        </div>
      )}

      {/* Preço atual */}
      <span className={priceClass}>{formattedPrice}</span>

    </div>
  )
}
