// Middleware de subdomínio — detecta lojas acessadas via subdomínio
// (ex: meu-slug.plataforma.com) e faz rewrite interno para /loja/meu-slug
//
// O path /loja/[slug] continua funcionando normalmente como fallback.
// Em dev local, subdomínios não funcionam por padrão — use /loja/{slug}.
// Para testar subdomínios localmente, configure NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
// e acesse via meu-slug.localhost:3000 (Chrome resolve *.localhost automaticamente).

import { NextRequest, NextResponse } from 'next/server'

// Subdomínios que NÃO representam lojas — são reservados da plataforma
const SUBDOMAINS_RESERVADOS = new Set([
  'www',
  'admin',
  'api',
  'app',
  'mail',
  'smtp',
  'ftp',
  'cdn',
  'static',
  'assets',
  'staging',
  'dev',
  'beta',
  // Subdomínios de imagem — o antigo img.esqueleton.com.br (custom domain do R2)
  // cai no wildcard *.esqueleton.com.br da Vercel; sem esta reserva, cada
  // requisição de imagem perdida renderizava uma página de loja inteira
  'img',
  'imagens',
  'pub',
  'media',
])

/**
 * Extrai o subdomínio do host, se houver.
 *
 * Exemplos:
 *   "meu-slug.plataforma.com"  → "meu-slug"
 *   "www.plataforma.com"       → null (reservado)
 *   "plataforma.com"           → null (domínio raiz)
 *   "localhost:3000"           → null (dev sem subdomínio)
 *   "meu-slug.localhost:3000"  → "meu-slug"
 */
function extrairSubdominio(host: string): string | null {
  // Remove a porta (ex: "meu-slug.localhost:3000" → "meu-slug.localhost")
  const hostSemPorta = host.split(':')[0]

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN
  if (rootDomain) {
    // Domínio raiz configurado — extrai o que vier antes dele
    const rootSemPorta = rootDomain.split(':')[0]
    if (!hostSemPorta.endsWith(`.${rootSemPorta}`)) return null
    const subdomain = hostSemPorta.slice(0, -(rootSemPorta.length + 1))
    if (!subdomain || subdomain.includes('.')) return null
    return SUBDOMAINS_RESERVADOS.has(subdomain) ? null : subdomain
  }

  // Sem domínio raiz configurado — inferência automática
  const partes = hostSemPorta.split('.')

  // localhost (ex: "meu-slug.localhost")
  if (partes[partes.length - 1] === 'localhost') {
    if (partes.length < 2) return null
    const subdomain = partes.slice(0, -1).join('.')
    if (subdomain.includes('.')) return null // mais de um nível não é slug
    return SUBDOMAINS_RESERVADOS.has(subdomain) ? null : subdomain
  }

  // Domínio real (ex: "meu-slug.plataforma.com" → 3 partes)
  // Precisamos de pelo menos 3 partes para ter um subdomínio
  if (partes.length < 3) return null

  // Trata domínios .com.br / .co.uk (TLD composto com 2 partes)
  const ultimaParte = partes[partes.length - 1]
  const penultimaParte = partes[partes.length - 2]
  const tldComposto = ultimaParte.length <= 3 && penultimaParte.length <= 3
  const partesMinimas = tldComposto ? 4 : 3

  if (partes.length < partesMinimas) return null

  const subdomain = partes.slice(0, -(partesMinimas - 1)).join('.')
  if (subdomain.includes('.')) return null // mais de um nível
  return SUBDOMAINS_RESERVADOS.has(subdomain) ? null : subdomain
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl
  const subdomain = extrairSubdominio(host)

  // ── Já estamos num subdomínio de loja (ex: meu-slug.plataforma.com) ──────────
  if (subdomain) {
    const prefixoRedundante = `/loja/${subdomain}`

    // Se a URL ainda carrega o prefixo /loja/{slug} (veio de um link montado no
    // formato antigo), redireciona para a versão limpa — assim o endereço na
    // barra do navegador mostra sempre só o subdomínio da loja.
    if (pathname === prefixoRedundante || pathname.startsWith(`${prefixoRedundante}/`)) {
      const url = request.nextUrl.clone()
      url.pathname = pathname.slice(prefixoRedundante.length) || '/'
      return NextResponse.redirect(url)
    }

    // Se por acaso o path aponta para OUTRA loja (/loja/outro-slug), não reescreve
    if (pathname.startsWith('/loja/')) return NextResponse.next()

    // Caminho limpo (ex: /produto/1) — faz rewrite interno para /loja/{slug}/produto/1.
    // O usuário continua vendo meu-slug.plataforma.com/produto/1.
    const url = request.nextUrl.clone()
    url.pathname = `/loja/${subdomain}${pathname}`
    return NextResponse.rewrite(url)
  }

  // ── Estamos no domínio raiz (ex: plataforma.com) ─────────────────────────────
  // Se alguém acessa /loja/{slug}/... no domínio raiz, redireciona para o
  // subdomínio da loja — o endereço passa a mostrar o nome da loja primeiro
  // (ex: /loja/meu-slug/produto/1 → meu-slug.plataforma.com/produto/1).
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN
  if (rootDomain) {
    const rootSemPorta = rootDomain.split(':')[0]
    const hostSemPorta = host.split(':')[0]
    // Só redireciona quando realmente estamos no domínio raiz — evita mexer em
    // previews da Vercel (*.vercel.app), onde subdomínios de loja não existem.
    const noDominioRaiz = hostSemPorta === rootSemPorta || hostSemPorta === `www.${rootSemPorta}`

    const partesDaLoja = pathname.match(/^\/loja\/([^/]+)(\/.*)?$/)
    if (noDominioRaiz && partesDaLoja) {
      const slug = partesDaLoja[1]
      const restante = partesDaLoja[2] ?? ''
      // Não redireciona slugs reservados (não são lojas de verdade)
      if (!SUBDOMAINS_RESERVADOS.has(slug)) {
        const url = request.nextUrl.clone()
        url.host = `${slug}.${rootDomain}`
        url.pathname = restante || '/'
        return NextResponse.redirect(url)
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Ignora assets estáticos do Next.js e arquivos comuns da raiz
    // (inclui todos os formatos de imagem — requisição de imagem nunca deve
    // virar renderização de página de loja)
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.json|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.webp$|.*\\.gif$|.*\\.avif$|.*\\.ico$|.*\\.svg$).*)',
  ],
}
