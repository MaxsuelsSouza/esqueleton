'use client'

// Lê o endereço (slug) da loja a partir da URL — usado nas páginas públicas /loja/[slug]/...
import { useParams } from 'next/navigation'

export function useStoreSlug(): string {
  const params = useParams<{ slug?: string }>()
  // Fora do segmento /loja/[slug] o parâmetro não existe — retorna vazio
  return typeof params?.slug === 'string' ? params.slug : ''
}
