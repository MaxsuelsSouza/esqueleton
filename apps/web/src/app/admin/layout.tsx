'use client'

// Layout da área administrativa — substitui o cabeçalho público por uma barra de navegação admin
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Package, Tag, BadgePercent, Ticket, Sparkles, LogOut, Store, LayoutDashboard, Bell, ExternalLink, Users, CreditCard } from 'lucide-react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { NotificationBell } from '@/components/admin/NotificationBell'
import { PendingOrdersPopup } from '@/components/admin/PendingOrdersPopup'

// Links do menu lateral — visíveis para todos os papéis
const NAV_LINKS = [
  { href: '/admin/dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/admin/produtos',      label: 'Produtos',       icon: Package },
  { href: '/admin/categorias',    label: 'Categorias',     icon: Tag },
  { href: '/admin/destaques',     label: 'Destaques',      icon: Sparkles },
  { href: '/admin/promocoes',     label: 'Promoções',      icon: BadgePercent },
  { href: '/admin/cupons',        label: 'Cupons',         icon: Ticket },
  { href: '/admin/notificacoes',  label: 'Notificações',   icon: Bell },
  { href: '/admin/perfil',        label: 'Perfil',         icon: Store },
  { href: '/admin/plano',         label: 'Plano',          icon: CreditCard },
]

// Links extras visíveis apenas para o OWNER
const OWNER_LINKS = [
  { href: '/admin/usuarios',      label: 'Equipe',         icon: Users },
]

// Páginas que não exibem a barra lateral nem verificam autenticação
const PUBLIC_PAGES = ['/admin/login', '/admin/esqueci-senha', '/admin/redefinir-senha', '/admin/verificar-email']

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicPage = PUBLIC_PAGES.some((p) => pathname.startsWith(p))
  const { isChecking, isOwner, emailVerified, logout } = useAdminAuth()
  const [scrolled, setScrolled] = useState(false)
  // Endereço (slug) da loja do admin, salvo no login — usado no link "Ver minha loja"
  const [storeSlug, setStoreSlug] = useState<string | null>(null)

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Lê o slug salvo no navegador (não existe durante a renderização no servidor)
  useEffect(() => {
    setStoreSlug(localStorage.getItem('admin_store_slug'))
  }, [pathname])

  // Páginas públicas (login, esqueci senha, etc) não exibem a barra lateral
  if (isPublicPage) {
    return <div className="min-h-screen bg-gray-50">{children}</div>
  }

  // Aguarda verificação do token antes de exibir conteúdo protegido
  if (isChecking) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50" />
  }

  // Monta a lista de links conforme o papel do usuário
  const navLinks = isOwner ? [...NAV_LINKS, ...OWNER_LINKS] : NAV_LINKS

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
          {navLinks.map(({ href, label, icon: Icon }) => (
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

        {/* Link discreto para abrir o site público da loja em outra aba */}
        {storeSlug && (
          <div className="px-3 pb-1">
            <a
              href={`/loja/${storeSlug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <ExternalLink size={16} />
              Ver minha loja
            </a>
          </div>
        )}

        {/* Botão de sair — fixo no rodapé da barra */}
        <div className="border-t p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo principal — min-w-0 impede que filhos expandam além da largura disponível */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Cabeçalho mobile — título, sino e botão de sair — fica fixo e encolhe ao rolar */}
        <header className={`sticky top-0 z-40 w-full overflow-hidden border-b bg-white shadow-sm transition-all duration-300 lg:hidden ${scrolled ? 'shadow-md' : ''}`}>
          <div className={`flex items-center justify-between px-4 transition-all duration-300 ${scrolled ? 'py-1.5' : 'py-3'}`}>
            <p className={`font-semibold text-gray-700 transition-all duration-300 ${scrolled ? 'text-xs' : 'text-sm'}`}>Administração</p>
            <div className="flex items-center gap-2">
              {storeSlug && (
                <a
                  href={`/loja/${storeSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Ver minha loja"
                  title="Ver minha loja"
                  className="text-gray-400 hover:text-gray-700"
                >
                  <ExternalLink size={18} />
                </a>
              )}
              <NotificationBell />
              <button onClick={logout} aria-label="Sair" className="text-gray-400 hover:text-gray-700">
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {/* Carrossel de navegação — rola dentro do cabeçalho sem mover a página */}
          <nav className={`flex w-full gap-1 overflow-x-auto px-3 [&::-webkit-scrollbar]:hidden transition-all duration-300 ${scrolled ? 'pb-1.5' : 'pb-3'}`} style={{ WebkitOverflowScrolling: 'touch' }}>
            {navLinks.map(({ href, label, icon: Icon }) => (
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

        {/* Banner de verificação de e-mail — visível enquanto o e-mail não for confirmado */}
        {!emailVerified && (
          <EmailVerificationBanner />
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
          {/* Popup de pedidos pendentes há mais de 3h — aparece em qualquer página do admin */}
          <PendingOrdersPopup />
        </main>
      </div>
    </div>
  )
}

// Banner amarelo no topo — pede para o usuário verificar o e-mail
function EmailVerificationBanner() {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleResend() {
    setSending(true)
    try {
      const token = localStorage.getItem('admin_token')
      if (!token) return

      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
      await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      setSent(true)
    } catch {
      // Silently fail — o usuário pode tentar novamente
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-b border-yellow-200 bg-yellow-50 px-4 py-3 text-center text-sm text-yellow-800">
      <span>Verifique seu e-mail para continuar usando o painel. </span>
      {sent ? (
        <span className="font-medium text-green-700">Link enviado! Verifique sua caixa de entrada.</span>
      ) : (
        <button
          onClick={handleResend}
          disabled={sending}
          className="font-medium text-yellow-900 underline transition-colors hover:text-yellow-700 disabled:opacity-50"
        >
          {sending ? 'Enviando...' : 'Reenviar e-mail de verificação'}
        </button>
      )}
    </div>
  )
}
