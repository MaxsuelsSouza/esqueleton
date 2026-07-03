// Estrutura visual compartilhada pelas páginas legais (/privacidade e /termos)
import Link from 'next/link'

type LegalPageLayoutProps = {
  title: string
  subtitle: string
  children: React.ReactNode
}

export function LegalPageLayout({ title, subtitle, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navegação simples de volta para a home */}
      <nav className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-900">
              <span className="text-xs font-bold text-white">E</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">Esqueleton</span>
          </Link>
          <Link
            href="/admin/login"
            className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            Entrar
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">{subtitle}</p>

        {/* Conteúdo do documento — títulos, parágrafos, listas e tabelas */}
        <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-gray-700 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-gray-900 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-900 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5 [&_a]:font-medium [&_a]:text-gray-900 [&_a]:underline">
          {children}
        </div>
      </main>

      <footer className="border-t border-gray-100 px-6 py-8 text-center text-xs text-gray-400">
        <div className="flex items-center justify-center gap-4">
          <Link href="/privacidade" className="transition-colors hover:text-gray-600">
            Política de Privacidade
          </Link>
          <Link href="/termos" className="transition-colors hover:text-gray-600">
            Termos de Uso
          </Link>
        </div>
        <p className="mt-3">© {new Date().getFullYear()} Esqueleton. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
