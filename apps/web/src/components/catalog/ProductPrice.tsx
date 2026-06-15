// Exibição do preço do produto
interface ProductPriceProps {
  price: number
  // 'sm' para cards | 'lg' para página de detalhe
  size?: 'sm' | 'lg'
}

export function ProductPrice({ price, size = 'sm' }: ProductPriceProps) {
  const formattedPrice = price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const priceClass = size === 'lg'
    ? 'text-3xl font-bold text-gray-900'
    : 'text-base font-bold text-gray-900 sm:text-lg'

  return (
    <div className="flex flex-col gap-0.5">
      <span className={priceClass}>{formattedPrice}</span>
    </div>
  )
}
