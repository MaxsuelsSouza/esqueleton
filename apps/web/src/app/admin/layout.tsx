'use client'

// Layout da área administrativa — substitui o cabeçalho público por uma barra de navegação admin
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Package, Tag, BadgePercent, Ticket, Sparkles, LogOut, Store, LayoutDashboard, Bell } from 'lucide-react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { NotificationBell } from '@/components/admin/NotificationBell'
import { PendingOrdersPopup } from '@/components/admin/PendingOrdersPopup'

// Links do menu lateral
const NAV_LINKS = [
  { href: '/admin/dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/admin/produtos',      label: 'Produtos',       icon: Package },
  { href: '/admin/categorias',    label: 'Categorias',     icon: Tag },
  { href: '/admin/destaques',     label: 'Destaques',      icon: Sparkles },
  { href: '/admin/promocoes',     label: 'Promoções',      icon: BadgePercent },
  { href: '/admin/cupons',        label: 'Cupons',         icon: Ticket },
  { href: '/admin/notificacoes',  label: 'Notificações',   icon: Bell },
  { href: '/admin/perfil',        label: 'Perfil',         icon: Store },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'
  const { isChecking } = useAdminAuth()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Na tela de login não exibe a barra lateral nem verifica autenticação
  if (isLoginPage) {
    return <div className="min-h-screen bg-gray-50">{children}</div>
  }

  // Aguarda verificação do token antes de exibir conteúdo protegido
  if (isChecking) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50" />
  }

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* Barra lateral — visível somente em telas maiores, fixa enquanto o conteúdo rola */}
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-white lg:flex lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">

        {/* Título da área admin + sino de notificações */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            Administração
          </p>
          <NotificationBell />
        </div>

        {/* Links de navegação */}
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                pathname.startsWith(href)
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Botão de sair — fixo no rodapé da barra */}
        <LogoutButton />
      </aside>

      {/* Conteúdo principal — min-w-0 impede que filhos expandam além da largura disponível */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Cabeçalho mobile — título, sino e botão de sair — fica fixo e encolhe ao rolar */}
        <header className={`sticky top-0 z-40 w-full overflow-hidden border-b bg-white shadow-sm transition-all duration-300 lg:hidden ${scrolled ? 'shadow-md' : ''}`}>
          <div className={`flex items-center justify-between px-4 transition-all duration-300 ${scrolled ? 'py-1.5' : 'py-3'}`}>
            <p className={`font-semibold text-gray-700 transition-all duration-300 ${scrolled ? 'text-xs' : 'text-sm'}`}>Administração</p>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <LogoutButton mobile />
            </div>
          </div>

          {/* Carrossel de navegação — rola dentro do cabeçalho sem mover a página */}
          <nav className={`flex w-full gap-1 overflow-x-auto px-3 [&::-webkit-scrollbar]:hidden transition-all duration-300 ${scrolled ? 'pb-1.5' : 'pb-3'}`} style={{ WebkitOverflowScrolling: 'touch' }}>
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname.startsWith(href)
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
          {/* Popup de pedidos pendentes há mais de 3h — aparece em qualquer página do admin */}
          <PendingOrdersPopup />
        </main>
      </div>
    </div>
  )
}

// Botão de sair — lê o token e limpa ao clicar
function LogoutButton({ mobile = false }: { mobile?: boolean }) {
  function handleLogout() {
    localStorage.removeItem('admin_token')
    window.location.href = '/admin/login'
  }

  if (mobile) {
    return (
      <button onClick={handleLogout} aria-label="Sair" className="text-gray-400 hover:text-gray-700">
        <LogOut size={18} />
      </button>
    )
  }

  return (
    <div className="border-t p-3">
      <button
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
      >
        <LogOut size={16} />
        Sair
      </button>
    </div>
  )
}
