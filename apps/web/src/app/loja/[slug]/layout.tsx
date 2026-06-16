// Layout do site público de uma loja (/loja/[slug]/...) —
// monta os contextos de perfil, cliente, favoritos e sacola e exibe o cabeçalho
import { BagProvider } from '@/modules/bag/contexts/bag-context'
import { FavoritesProvider } from '@/modules/favorites/contexts/favorites-context'
import { StoreProfileProvider } from '@/modules/store-profile/contexts/store-profile-context'
import { CustomerProvider } from '@/modules/customers/contexts/customer-context'
import { HeaderWithProfile } from '@/shared/layout/header/HeaderWithProfile'
import { AnnouncementBar } from '@/shared/layout/header/AnnouncementBar'

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
