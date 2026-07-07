'use client'

// Banner da loja — imagem exibida logo abaixo do cabeçalho no catálogo público.
// Ocupa da base do header até a metade da tela; a imagem é cortada (object-cover)
// para preencher a área inteira.
//
// A loja pode configurar duas versões: uma para computador (bannerUrl) e outra
// para celular (bannerMobileUrl). O <picture> troca a imagem pelo tamanho da tela;
// quando só uma versão existe, ela é exibida em ambos.
//
// Ação de rolagem: ao rolar para baixo com o banner ainda visível, a página
// desliza sozinha até o início do catálogo (card de destaque para baixo),
// alinhado logo abaixo do cabeçalho fixo.
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useStoreProfile } from '../contexts/store-profile-context'

// Telas até este tamanho usam o banner de celular (mesmo ponto de quebra "sm" do Tailwind)
const MOBILE_MAX_WIDTH = '639px'

// Altura padrão do cabeçalho fixo, usada se ele não for encontrado no DOM
const ALTURA_HEADER_PADRAO = 64

// Tempo da animação de rolagem — durante ele, novos gestos são ignorados
const DURACAO_ROLAGEM_MS = 800

// Movimento mínimo do dedo (px) para considerar que o usuário rolou para baixo
const GESTO_MINIMO_TOQUE = 10

// Decide como abrir o link do banner:
//   - caminho começando com "/" ou URL do próprio site → navegação interna (mesma aba)
//   - qualquer outra URL → site externo (nova aba)
function resolverLinkDoBanner(link: string): { href: string; isExternal: boolean } {
  if (link.startsWith('/')) return { href: link, isExternal: false }
  try {
    const url = new URL(link)
    // URL completa apontando para o próprio site — navega internamente sem recarregar
    if (typeof window !== 'undefined' && url.origin === window.location.origin) {
      return { href: url.pathname + url.search + url.hash, isExternal: false }
    }
  } catch {
    // URL malformada — trata como externa; o navegador resolve (ou ignora) o clique
  }
  return { href: link, isExternal: true }
}

export function StoreBanner() {
  const { profile } = useStoreProfile()
  const bannerRef = useRef<HTMLDivElement>(null)
  // Evita disparar a rolagem de novo enquanto a animação anterior acontece
  const isAutoScrolling = useRef(false)

  const desktopUrl = profile.bannerUrl
  const mobileUrl = profile.bannerMobileUrl
  const hasBanner = Boolean(desktopUrl || mobileUrl)

  useEffect(() => {
    if (!hasBanner) return
    // Usuários que preferem menos movimento mantêm a rolagem normal
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    function alturaDoHeader() {
      return document.querySelector('header')?.offsetHeight ?? ALTURA_HEADER_PADRAO
    }

    // O banner ainda ocupa espaço útil na tela (abaixo do cabeçalho)?
    function bannerVisivel() {
      const banner = bannerRef.current
      if (!banner) return false
      return banner.getBoundingClientRect().bottom > alturaDoHeader() + 8
    }

    // Rola até o fim do banner — o catálogo (destaque para baixo) fica alinhado ao header
    function rolarParaOCatalogo() {
      const banner = bannerRef.current
      if (!banner || isAutoScrolling.current) return
      isAutoScrolling.current = true
      const destino = window.scrollY + banner.getBoundingClientRect().bottom - alturaDoHeader()
      window.scrollTo({ top: destino, behavior: 'smooth' })
      window.setTimeout(() => { isAutoScrolling.current = false }, DURACAO_ROLAGEM_MS)
    }

    // Roda do mouse / trackpad
    function handleWheel(event: WheelEvent) {
      if (event.deltaY <= 0) return // só rolagem para baixo
      if (!bannerVisivel()) return
      event.preventDefault()
      rolarParaOCatalogo()
    }

    // Toque (celular): detecta o dedo arrastando para cima = rolagem para baixo
    let toqueInicialY = 0
    function handleTouchStart(event: TouchEvent) {
      toqueInicialY = event.touches[0].clientY
    }
    function handleTouchMove(event: TouchEvent) {
      const arrastou = toqueInicialY - event.touches[0].clientY
      if (arrastou < GESTO_MINIMO_TOQUE) return
      if (!bannerVisivel()) return
      event.preventDefault()
      rolarParaOCatalogo()
    }

    // passive: false é necessário para poder cancelar a rolagem nativa
    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [hasBanner])

  // Loja sem nenhum banner configurado — o catálogo aparece normalmente, sem espaço vazio
  if (!hasBanner) return null

  const imagem = (
    <picture className="block h-full w-full">
      {/* No celular, usa a versão mobile quando ela existir */}
      {mobileUrl && desktopUrl && (
        <source media={`(max-width: ${MOBILE_MAX_WIDTH})`} srcSet={mobileUrl} />
      )}
      <img
        src={desktopUrl ?? mobileUrl ?? undefined}
        alt={`Banner de ${profile.storeName}`}
        className="h-full w-full object-cover"
      />
    </picture>
  )

  // Com link configurado, o banner inteiro vira uma área clicável
  let conteudo = imagem
  if (profile.bannerLink) {
    const { href, isExternal } = resolverLinkDoBanner(profile.bannerLink)
    conteudo = isExternal ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
        {imagem}
      </a>
    ) : (
      <Link href={href} className="block h-full w-full">
        {imagem}
      </Link>
    )
  }

  return (
    <div ref={bannerRef} className="h-[calc(50vh-4rem)] min-h-[180px] w-full overflow-hidden bg-gray-100">
      {conteudo}
    </div>
  )
}
