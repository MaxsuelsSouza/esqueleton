'use client'

// Providers client-only da loja — extraídos do layout para permitir que o layout
// seja um Server Component (necessário para exportar generateMetadata)
import { BagProvider } from '@/modules/bag/contexts/bag-context'
import { FavoritesProvider } from '@/modules/favorites/contexts/favorites-context'
import { StoreProfileProvider } from '@/modules/store-profile/contexts/store-profile-context'
import { CustomerProvider } from '@/modules/customers/contexts/customer-context'
import { HeaderWithProfile } from '@/shared/layout/header/HeaderWithProfile'
import { AnnouncementBar } from '@/shared/layout/header/AnnouncementBar'

export function StoreProviders({ children }: { children: React.ReactNode }) {
  return (
    <StoreProfileProvider>
      <CustomerProvider>
        <FavoritesProvider>
          <BagProvider>
            <AnnouncementBar />
            <HeaderWithProfile />
            {children}
          </BagProvider>
        </FavoritesProvider>
      </CustomerProvider>
    </StoreProfileProvider>
  )
}
