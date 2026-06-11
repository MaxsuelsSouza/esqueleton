// Layout do site público de uma loja (/loja/[slug]/...) —
// monta os contextos de perfil, cliente, favoritos e sacola e exibe o cabeçalho
import { BagProvider } from '@/contexts/bag-context'
import { FavoritesProvider } from '@/contexts/favorites-context'
import { StoreProfileProvider } from '@/contexts/store-profile-context'
import { CustomerProvider } from '@/contexts/customer-context'
import { HeaderWithProfile } from '@/components/header/HeaderWithProfile'
import { AnnouncementBar } from '@/components/header/AnnouncementBar'

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
