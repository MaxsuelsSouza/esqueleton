'use client'

// Contexto do perfil da loja — carrega nome, logo e cor do tema uma vez e distribui para toda a aplicação
import { createContext, useContext, useEffect, useState } from 'react'
import { storeProfileService } from '@/services/store-profile.service'
import { useStoreSlug } from '@/hooks/useStoreSlug'
import type { StoreProfile } from '@esqueleton/shared'


const DEFAULT_PROFILE: StoreProfile = {
  id: 'singleton',
  storeName: 'Minha Loja',
  themeColor: '#000000',
  announcements: [],
  updatedAt: '',
}

interface StoreProfileContextValue {
  profile: StoreProfile
  // Atualiza o perfil em memória após salvar no admin (evita recarregar a página)
  setProfile: (profile: StoreProfile) => void
}

const StoreProfileContext = createContext<StoreProfileContextValue>({
  profile: DEFAULT_PROFILE,
  setProfile: () => {},
})

export function StoreProfileProvider({ children }: { children: React.ReactNode }) {
  // Slug da loja visitada — o perfil público é buscado pela rota /lojas/:slug
  const slug = useStoreSlug()
  const [profile, setProfile] = useState<StoreProfile>(DEFAULT_PROFILE)
  // true quando a API responde 503 — loja fora do ar (período de teste vencido
  // sem assinatura ativa); o visitante vê apenas um erro genérico
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    if (!slug) return
    storeProfileService
      .getPublicProfile(slug)
      .then(setProfile)
      .catch((error: unknown) => {
        if ((error as { status?: number })?.status === 503) {
          setUnavailable(true)
        }
        // Outras falhas mantêm os valores padrão silenciosamente
      })
  }, [slug])

  // Aplica a cor do tema como variável CSS no elemento raiz
  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', profile.themeColor)
  }, [profile.themeColor])

  // Loja indisponível: nada do site aparece, apenas o erro genérico —
  // de propósito, sem revelar que é uma pendência do lojista
  if (unavailable) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <p className="text-4xl">😕</p>
        <h1 className="text-lg font-semibold text-gray-900">Ops! Aconteceu um erro</h1>
        <p className="text-sm text-gray-500">Tente novamente mais tarde.</p>
      </div>
    )
  }

  return (
    <StoreProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </StoreProfileContext.Provider>
  )
}

export function useStoreProfile() {
  return useContext(StoreProfileContext)
}
