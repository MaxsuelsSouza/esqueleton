'use client'

// Cabeçalho principal da loja — fundo sempre branco
// Desktop: logo | pesquisa | ofertas | favoritos | sacola
// Mobile:  menu (3 traços) | logo grande no meio | ícones à direita (busca expande abaixo)
// Existe apenas dentro do site público da loja (/loja/[slug]/...)
// Ao rolar para baixo o header fica mais compacto (padding reduzido)
import { useState, useEffect } from 'react'
import { Menu, Search, X } from 'lucide-react'
import { LogoArea } from './LogoArea'
import { SearchBar } from './SearchBar'
import { FavoritesButton } from './FavoritesButton'
import { BagButton } from './BagButton'
import { CustomerButton } from './CustomerButton'
import { MobileMenuDrawer } from './MobileMenuDrawer'

interface HeaderProps {
  logoUrl?: string
  storeName?: string
}

export function Header({ logoUrl, storeName }: HeaderProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  // Controla o menu lateral de categorias e promoções (somente mobile)
  const [menuOpen, setMenuOpen] = useState(false)
  // true quando o usuário rolou mais de 40px — ativa o modo compacto
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`sticky top-0 z-50 border-b bg-white shadow-sm transition-all duration-300 ${scrolled ? 'shadow-md' : ''}`}>
      {/* No mobile a logo (quando existe) é absoluta — o espaçador dentro da
          LogoArea reserva a altura dela; sem logo o header fica na altura natural */}
      <div
        className={`relative mx-auto flex max-w-screen-xl items-center justify-between px-4 sm:px-6 transition-all duration-300 ${
          scrolled ? 'py-1.5' : 'py-3'
        }`}
      >
        {/* Grupo da esquerda: menu (mobile) + logo/nome da loja */}
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu de categorias e promoções"
            className="text-gray-700 hover:text-black md:hidden"
          >
            <Menu size={24} />
          </button>

          <LogoArea imageUrl={logoUrl} storeName={storeName} compact={scrolled} />
        </div>

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

          <CustomerButton />

          <FavoritesButton />
          <BagButton />
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="border-t px-4 py-3 md:hidden">
          <SearchBar autoFocus />
        </div>
      )}

      {/* Menu lateral com categorias e promoções (mobile) */}
      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  )
}
