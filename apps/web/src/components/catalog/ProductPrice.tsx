// Exibição do preço do produto — com suporte a preço original riscado e tag de desconto
interface ProductPriceProps {
  price: number
  // 'sm' para cards | 'lg' para página de detalhe
  size?: 'sm' | 'lg'
  // Preço antes da promoção — quando presente, aparece riscado acima do preço atual
  originalPrice?: number
  // Percentual de desconto — quando presente, aparece como tag verde ao lado do valor original
  discountPercent?: number
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ProductPrice({ price, size = 'sm', originalPrice, discountPercent }: ProductPriceProps) {
  const hasDiscount = originalPrice !== undefined && originalPrice > price

  if (size === 'lg') {
    return (
      <div className="flex flex-col gap-1">
        {hasDiscount && (
          <div className="flex items-center gap-2">
            <span className="text-base text-gray-400 line-through">{formatBRL(originalPrice)}</span>
            {discountPercent && (
              <span className="rounded-lg bg-green-100 px-2 py-0.5 text-sm font-bold text-green-700">
                -{discountPercent}%
              </span>
            )}
          </div>
        )}
        <span className="text-3xl font-bold text-gray-900">{formatBRL(price)}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {hasDiscount && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 line-through">{formatBRL(originalPrice)}</span>
          {discountPercent && (
            <span className="rounded bg-green-100 px-1 py-px text-[10px] font-bold text-green-700">
              -{discountPercent}%
            </span>
          )}
        </div>
      )}
      <span className="text-base font-bold text-gray-900 sm:text-lg">{formatBRL(price)}</span>
    </div>
  )
}
