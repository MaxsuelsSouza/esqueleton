// Página de detalhe do produto — Server Component que gera meta tags OG
// dinâmicas e renderiza o componente client interativo
import type { Metadata } from 'next'
import ProductDetailClient from './ProductDetailClient'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// Verifica se a URL é uma imagem hospedada (HTTP/HTTPS) — imagens base64 não
// funcionam como og:image porque crawlers não renderizam data URIs
function isHttpUrl(url: string | undefined | null): url is string {
  return !!url && url.startsWith('http')
}

// Trunca a descrição em 160 caracteres para o og:description
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 1).trimEnd() + '\u2026'
}

// Formata preço em BRL (ex: 129.9 → "129,90")
function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}): Promise<Metadata> {
  const { slug, id } = await params

  try {
    // Busca produto e perfil da loja em paralelo
    const [productRes, profileRes] = await Promise.all([
      fetch(`${API_URL}/api/lojas/${encodeURIComponent(slug)}/products/${id}`, {
        next: { revalidate: 60 },
      }),
      fetch(`${API_URL}/api/lojas/${encodeURIComponent(slug)}/store-profile`, {
        next: { revalidate: 60 },
      }),
    ])

    if (!productRes.ok) {
      return { title: 'Produto não encontrado' }
    }

    const product = await productRes.json()
    const profile = profileRes.ok ? await profileRes.json() : null

    const storeName = profile?.storeName ?? slug
    const title = `${product.name} | ${storeName}`
    const description = product.description
      ? truncate(product.description, 160)
      : `${product.name} — R$ ${formatPrice(product.price)} em ${storeName}`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        locale: 'pt_BR',
        siteName: storeName,
        ...(isHttpUrl(product.imageUrl) ? { images: [{ url: product.imageUrl }] } : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        ...(isHttpUrl(product.imageUrl) ? { images: [product.imageUrl] } : {}),
      },
    }
  } catch {
    return { title: 'Produto' }
  }
}

export default function ProductDetailPage() {
  return <ProductDetailClient />
}
