'use client'

// Botão de favoritos — navega para os favoritos da loja, exibe contador de itens salvos
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useFavorites } from '@/modules/favorites/contexts/favorites-context'
import { useStoreSlug } from '@/shared/hooks/useStoreSlug'

export function FavoritesButton() {
  const router = useRouter()
  const { favoriteIds } = useFavorites()
  const slug = useStoreSlug()
  const count = favoriteIds.length

  return (
    <button
      onClick={() => router.push(`/loja/${slug}/favoritos`)}
      aria-label={`Favoritos${count > 0 ? ` (${count} itens)` : ''}`}
      className="relative flex flex-col items-center gap-0.5 text-gray-600 transition-colors hover:text-black"
    >
      <Heart size={22} />
      <span className="hidden text-xs sm:block">Favoritos</span>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </button>
  )
}
