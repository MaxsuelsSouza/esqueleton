'use client'

// Cabeçalho principal da loja — fundo sempre branco
// Desktop: logo | pesquisa | ofertas | favoritos | sacola
// Mobile:  logo | ícone de busca | favoritos | sacola  (busca expande abaixo)
// Não é exibido nas rotas de administração (/admin)
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { LogoArea } from './LogoArea'
import { SearchBar } from './SearchBar'
import { OffersLink } from './OffersLink'
import { FavoritesButton } from './FavoritesButton'
import { BagButton } from './BagButton'
import { CustomerButton } from './CustomerButton'

interface HeaderProps {
  logoUrl?: string
  storeName?: string
}

export function Header({ logoUrl, storeName }: HeaderProps) {
  const pathname = usePathname()
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  if (pathname.startsWith('/admin')) return null

  return (
    <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3 sm:px-6">

        <LogoArea imageUrl={logoUrl} storeName={storeName} />

        <div className="flex items-center gap-3 sm:gap-6">

          <div className="hidden md:block">
            <SearchBar />
          </div>

          <button
            onClick={() => setMobileSearchOpen((prev) => !prev)}
            aria-label={mobileSearchOpen ? 'Fechar busca' : 'Abrir busca'}
            className="text-gray-600 hover:text-black md:hidden"
          >
            {mobileSearchOpen ? <X size={22} /> : <Search size={22} />}
          </button>

          <div className="hidden sm:block">
            <OffersLink />
          </div>

          <div className="hidden sm:block">
            <CustomerButton />
          </div>

          <FavoritesButton />
          <BagButton />
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="border-t px-4 py-3 md:hidden">
          <SearchBar autoFocus />
        </div>
      )}
    </header>
  )
}
