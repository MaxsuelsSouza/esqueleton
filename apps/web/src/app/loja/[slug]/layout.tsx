// Layout do site público de uma loja (/loja/[slug]/...) —
// Server Component que gera meta tags OG dinâmicas e monta os providers client-only
import type { Metadata } from 'next'
import { StoreProviders } from './StoreProviders'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// Verifica se a URL é uma imagem hospedada (HTTP/HTTPS) — imagens base64 não
// funcionam como og:image porque crawlers não renderizam data URIs
function isHttpUrl(url: string | undefined | null): url is string {
  return !!url && url.startsWith('http')
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params

  try {
    const res = await fetch(`${API_URL}/api/lojas/${encodeURIComponent(slug)}/store-profile`, {
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      return { title: 'Loja não encontrada' }
    }

    const profile = await res.json()
    const storeName = profile.storeName ?? slug
    const description = `Confira os produtos de ${storeName}`

    return {
      title: storeName,
      description,
      openGraph: {
        title: storeName,
        description,
        type: 'website',
        locale: 'pt_BR',
        siteName: 'Esqueleton',
        ...(isHttpUrl(profile.logoUrl) ? { images: [{ url: profile.logoUrl }] } : {}),
      },
      twitter: {
        card: 'summary',
        title: storeName,
        description,
        ...(isHttpUrl(profile.logoUrl) ? { images: [profile.logoUrl] } : {}),
      },
    }
  } catch {
    return { title: slug }
  }
}

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <StoreProviders>{children}</StoreProviders>
}
