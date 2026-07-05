'use client'

// Área da logo do cabeçalho
// Mobile: logo grande centralizada no meio do header
// Desktop: logo no canto esquerdo
// Clique leva de volta ao catálogo da loja que está sendo visitada
import { useState, useEffect } from 'react'
import { useStoreSlug } from '@/shared/hooks/useStoreSlug'

interface LogoAreaProps {
  imageUrl?: string
  storeName?: string
  // Modo compacto — ativado quando o usuário rolou a página para baixo
  compact?: boolean
}

export function LogoArea({ imageUrl, storeName = 'Minha Loja', compact }: LogoAreaProps) {
  const slug = useStoreSlug()
  // Usa o logo do cache enquanto o perfil da API não chega (evita flash do nome "Minha Loja")
  const [cachedLogo, setCachedLogo] = useState<string | undefined>(undefined)
  // Indica que o client já verificou o cache — só mostra o fallback de texto após essa checagem
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!slug) return
    try {
      const saved = localStorage.getItem(`store_logo_${slug}`)
      if (saved) setCachedLogo(saved)
    } catch {}
    setChecked(true)
  }, [slug])

  const logo = imageUrl || cachedLogo

  // Com logo: no mobile ela fica destacada perto do centro (left-[40%]).
  // Sem logo: o nome da loja fica no canto esquerdo, no fluxo normal,
  // ao lado do botão de menu.
  const posicaoMobile = logo
    ? 'absolute left-[40%] top-1/2 -translate-x-1/2 -translate-y-1/2 md:static md:translate-x-0 md:translate-y-0'
    : ''

  return (
    <>
      {/* A logo é absoluta no mobile e não "estica" o header — este espaçador
          invisível define a altura do header (menor que a logo de propósito:
          a logo ampliada "vaza" para a área de padding sem aumentar o header). */}
      {logo && (
        <span
          aria-hidden
          className={`w-0 transition-all duration-300 md:hidden ${compact ? 'h-8' : 'h-12'}`}
        />
      )}
    <a
      href={`/loja/${slug}`}
      className={`flex shrink-0 items-center gap-2 ${posicaoMobile}`}
    >
      {logo ? (
        <img
          src={logo}
          alt={`Logo ${storeName}`}
          // max-w no mobile evita que logos largas invadam os ícones da direita
          // scale amplia a logo visualmente sem aumentar o header — compensa
          // o espaço em branco que costuma existir ao redor da imagem
          className={`w-auto max-w-[50vw] scale-[1.75] object-contain transition-all duration-300 md:max-w-none ${
            compact ? 'h-10 md:h-7 lg:h-8' : 'h-16 md:h-10 lg:h-14'
          }`}
        />
      ) : checked ? (
        <span className={`whitespace-nowrap font-bold tracking-tight text-gray-900 transition-all duration-300 ${compact ? 'text-base lg:text-lg' : 'text-xl lg:text-3xl'}`}>
          {storeName}
        </span>
      ) : (
        // Placeholder invisível com a mesma altura — evita layout shift e flash de texto
        <span className={`invisible font-bold tracking-tight ${compact ? 'text-base lg:text-lg' : 'text-xl lg:text-3xl'}`}>
          &nbsp;
        </span>
      )}
    </a>
    </>
  )
}
