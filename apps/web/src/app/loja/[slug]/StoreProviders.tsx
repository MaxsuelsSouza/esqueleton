'use client'

// Providers client-only da loja — extraídos do layout para permitir que o layout
// seja um Server Component (necessário para exportar generateMetadata)
import Link from 'next/link'
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
            {/* Rodapé legal — link para a política de privacidade da plataforma (LGPD) */}
            <footer className="border-t border-gray-100 bg-white px-6 py-6 text-center text-xs text-gray-400">
              <div className="flex items-center justify-center gap-4">
                <Link href="/privacidade" className="transition-colors hover:text-gray-600">
                  Política de Privacidade
                </Link>
                <Link href="/termos" className="transition-colors hover:text-gray-600">
                  Termos de Uso
                </Link>
              </div>
              <p className="mt-2">Vitrine criada com Esqueleton</p>
            </footer>
          </BagProvider>
        </FavoritesProvider>
      </CustomerProvider>
    </StoreProfileProvider>
  )
}
