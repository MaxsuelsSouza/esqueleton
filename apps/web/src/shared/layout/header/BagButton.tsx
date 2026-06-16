'use client'

// Botão da sacola de compras — exibe a quantidade de itens e navega para a sacola da loja
import { useRouter } from 'next/navigation'
import { ShoppingBag } from 'lucide-react'
import { useBag } from '@/modules/bag/contexts/bag-context'
import { useStoreSlug } from '@/shared/hooks/useStoreSlug'

export function BagButton() {
  const { totalItems } = useBag()
  const router = useRouter()
  const slug = useStoreSlug()

  return (
    <button
      onClick={() => router.push(`/loja/${slug}/sacola`)}
      aria-label={`Sacola${totalItems > 0 ? ` (${totalItems} itens)` : ''}`}
      className="relative flex flex-col items-center gap-0.5 text-gray-600 transition-colors hover:text-black"
    >
      <ShoppingBag size={22} />
      <span className="hidden text-xs sm:block">Sacola</span>
      {totalItems > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: 'var(--color-primary, #000000)' }}
        >
          {totalItems > 9 ? '9+' : totalItems}
        </span>
      )}
    </button>
  )
}
