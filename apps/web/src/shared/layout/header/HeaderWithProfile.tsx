'use client'

// Wrapper que injeta o nome e logo do perfil da loja no Header público
import { Header } from './Header'
import { useStoreProfile } from '@/modules/store-profile/contexts/store-profile-context'

export function HeaderWithProfile() {
  const { profile } = useStoreProfile()
  return <Header storeName={profile.storeName} logoUrl={profile.logoUrl ?? undefined} />
}
