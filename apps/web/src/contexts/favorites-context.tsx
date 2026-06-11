'use client'

// Contexto global de favoritos — persiste no localStorage e registra eventos de analytics
import { createContext, useContext, useState, useEffect } from 'react'
import type { Product } from '@esqueleton/shared'
import { analyticsService } from '@/services/analytics.service'
import { useStoreSlug } from '@/hooks/useStoreSlug'

interface FavoritesContextValue {
  favoriteIds: string[]
  isFavorited: (productId: string) => boolean
  toggleFavorite: (product: Product) => void
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  // A chave do localStorage inclui o slug da loja — favoritos de lojas diferentes não se misturam
  const slug = useStoreSlug()
  const storageKey = `favoritos:${slug}`

  const [favoriteIds, setFavoriteIds] = useState<string[]>([])

  // Recupera os favoritos salvos no navegador ao iniciar (e ao trocar de loja)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      setFavoriteIds(saved ? JSON.parse(saved) : [])
    } catch {}
  }, [storageKey])

  function toggleFavorite(product: Product) {
    setFavoriteIds((prev) => {
      const isAlreadyFavorited = prev.includes(product.id)
      const next = isAlreadyFavorited
        ? prev.filter((id) => id !== product.id)
        : [...prev, product.id]

      localStorage.setItem(storageKey, JSON.stringify(next))

      // Registra o evento apenas ao adicionar — fire and forget
      if (!isAlreadyFavorited) {
        analyticsService.recordEvent(slug, {
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
