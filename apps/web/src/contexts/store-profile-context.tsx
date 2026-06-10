'use client'

// Contexto do perfil da loja — carrega nome, logo e cor do tema uma vez e distribui para toda a aplicação
import { createContext, useContext, useEffect, useState } from 'react'
import { storeProfileService } from '@/services/store-profile.service'
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
  const [profile, setProfile] = useState<StoreProfile>(DEFAULT_PROFILE)

  useEffect(() => {
    storeProfileService
      .getProfile()
      .then(setProfile)
      .catch(() => {
        // Se a API não estiver disponível, mantém os valores padrão silenciosamente
      })
  }, [])

  // Aplica a cor do tema como variável CSS no elemento raiz
  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', profile.themeColor)
  }, [profile.themeColor])

  return (
    <StoreProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </StoreProfileContext.Provider>
  )
}

export function useStoreProfile() {
  return useContext(StoreProfileContext)
}
