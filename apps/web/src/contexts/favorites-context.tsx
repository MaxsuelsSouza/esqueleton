'use client'

// Contexto global de favoritos — persiste os IDs dos produtos no servidor (Redis)
// em vez do localStorage, evitando acúmulo de dados no navegador.
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import type { Product } from '@esqueleton/shared'
import { analyticsService } from '@/services/analytics.service'
import { sessionService } from '@/services/session.service'
import { useStoreSlug } from '@/hooks/useStoreSlug'

interface FavoritesContextValue {
  favoriteIds: string[]
  isLoading: boolean
  isFavorited: (productId: string) => boolean
  toggleFavorite: (product: Product) => void
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const slug = useStoreSlug()

  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Ref para evitar sincronizar o estado inicial de volta ao servidor
  const loaded = useRef(false)

  // Carrega os favoritos do servidor ao montar (e ao trocar de loja).
  // Na primeira vez após a migração, verifica se há dados antigos no localStorage
  // e envia para o servidor — assim o visitante não perde os favoritos que já tinha.
  useEffect(() => {
    if (!slug) return
    loaded.current = false
    setIsLoading(true)

    sessionService.getFavorites(slug)
      .then(async (ids) => {
        // Se o servidor está vazio, tenta migrar dados antigos do localStorage
        if (ids.length === 0) {
          try {
            const oldKey = `favoritos:${slug}`
            const oldData = localStorage.getItem(oldKey)
            if (oldData) {
              const oldIds = JSON.parse(oldData) as string[]
              if (oldIds.length > 0) {
                await sessionService.setFavorites(slug, oldIds)
                ids = oldIds
              }
              localStorage.removeItem(oldKey)
            }
          } catch {}
        }
        setFavoriteIds(ids)
        loaded.current = true
      })
      .catch(() => {
        setFavoriteIds([])
        loaded.current = true
      })
      .finally(() => setIsLoading(false))
  }, [slug])

  // Sincroniza com o servidor
  const syncToServer = useCallback((ids: string[]) => {
    if (!slug || !loaded.current) return
    sessionService.setFavorites(slug, ids)
  }, [slug])

  function toggleFavorite(product: Product) {
    setFavoriteIds((prev) => {
      const isAlreadyFavorited = prev.includes(product.id)
      const next = isAlreadyFavorited
        ? prev.filter((id) => id !== product.id)
        : [...prev, product.id]

      syncToServer(next)

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
    <FavoritesContext.Provider value={{ favoriteIds, isLoading, isFavorited, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites deve ser usado dentro de FavoritesProvider')
  return ctx
}
