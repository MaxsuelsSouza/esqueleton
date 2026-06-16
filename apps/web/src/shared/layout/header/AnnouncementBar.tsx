'use client'

// Barra de avisos acima do cabeçalho — exibe as mensagens configuradas no perfil em rotação
// Só aparece quando há pelo menos uma mensagem cadastrada
import { useState, useEffect } from 'react'
import { useStoreProfile } from '@/modules/store-profile/contexts/store-profile-context'
import { useStoreSlug } from '@/shared/hooks/useStoreSlug'
import { usePathname } from 'next/navigation'

export function AnnouncementBar() {
  const { profile } = useStoreProfile()
  const slug = useStoreSlug()
  const pathname = usePathname()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [fading, setFading] = useState(false)

  // Garante array mesmo que o campo ainda não exista no banco (antes da migração)
  const messages = profile.announcements ?? []

  useEffect(() => {
    // Reseta o índice quando a lista de mensagens mudar
    setCurrentIndex(0)
  }, [messages.length])

  useEffect(() => {
    // Com uma só mensagem não precisa rotacionar
    if (messages.length <= 1) return

    const interval = setInterval(() => {
      // Fade out → troca → fade in
      setFading(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % messages.length)
        setFading(false)
      }, 300)
    }, 4000)

    return () => clearInterval(interval)
  }, [messages.length])

  // Exibe apenas na página inicial do catálogo da loja (/loja/<slug>)
  if (pathname !== `/loja/${slug}` || messages.length === 0) return null

  return (
    <div
      className="w-full py-2 text-center text-xs font-medium"
      style={{
        backgroundColor: 'var(--color-primary, #000000)',
        color: 'var(--header-text, #ffffff)',
      }}
    >
      <span
        className="transition-opacity duration-300"
        style={{ opacity: fading ? 0 : 1 }}
      >
        {messages[currentIndex]}
      </span>
    </div>
  )
}
