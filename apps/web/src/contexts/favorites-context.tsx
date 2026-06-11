'use client'

// Contexto global de favoritos — persiste no localStorage e registra eventos de analytics
import { createContext, useContext, useState, useEffect } from 'react'
import type { Product } from '@esqueleton/shared'
import { analyticsService } from '@/services/analytics.service'

interface FavoritesContextValue {
  favoriteIds: string[]
  isFavorited: (productId: string) => boolean
  toggleFavorite: (product: Product) => void
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

const STORAGE_KEY = 'favorite_product_ids'

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])

  // Recupera os favoritos salvos no navegador ao iniciar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setFavoriteIds(JSON.parse(saved))
    } catch {}
  }, [])

  function toggleFavorite(product: Product) {
    setFavoriteIds((prev) => {
      const isAlreadyFavorited = prev.includes(product.id)
      const next = isAlreadyFavorited
        ? prev.filter((id) => id !== product.id)
        : [...prev, product.id]

      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))

      // Registra o evento apenas ao adicionar — fire and forget
      if (!isAlreadyFavorited) {
        analyticsService.recordEvent({
          productId: product.id,
          productName: product.brand ? `${product.brand} ${product.name}` : product.name,
          eventType: 'FAVORITE_ADD',
        })
      }

      return next
    })
  }

  function isFavorited(productId: string) {
    return favoriteIds.includes(productId)
  }

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorited, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites deve ser usado dentro de FavoritesProvider')
  return ctx
}
