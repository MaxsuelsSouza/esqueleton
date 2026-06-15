import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RouteLoadingBar } from '@/components/shared/RouteLoadingBar'
import './globals.css'

export const metadata: Metadata = {
  title: 'Esqueleton — Catálogo online grátis para sua loja',
  description:
    'Monte a vitrine da sua loja em minutos e receba pedidos direto no seu WhatsApp. Grátis, sem taxa por venda.',
  openGraph: {
    title: 'Esqueleton — Catálogo online grátis para sua loja',
    description:
      'Monte a vitrine da sua loja em minutos e receba pedidos direto no seu WhatsApp. Grátis, sem taxa por venda.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Esqueleton',
    // Substitua pela URL real da imagem OG quando tiver o print do celular com a vitrine
    // images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Vitrine de uma loja no Esqueleton' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Esqueleton — Catálogo online grátis para sua loja',
    description:
      'Monte a vitrine da sua loja em minutos e receba pedidos direto no seu WhatsApp. Grátis, sem taxa por venda.',
  },
}

// Layout raiz — apenas a estrutura básica da página.
// O cabeçalho e os contextos do site público vivem em /loja/[slug]/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Suspense fallback={null}>
          <RouteLoadingBar />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
