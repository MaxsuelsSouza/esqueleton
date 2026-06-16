'use client'

// Área da logo no canto esquerdo do cabeçalho
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

  return (
    <a href={`/loja/${slug}`} className="flex shrink-0 items-center gap-2">
      {logo ? (
        <img
          src={logo}
          alt={`Logo ${storeName}`}
          className={`w-auto object-contain transition-all duration-300 ${compact ? 'h-7 lg:h-8' : 'h-10 lg:h-14'}`}
        />
      ) : checked ? (
        <span className={`font-bold tracking-tight text-gray-900 transition-all duration-300 ${compact ? 'text-base lg:text-lg' : 'text-xl lg:text-3xl'}`}>
          {storeName}
        </span>
      ) : (
        // Placeholder invisível com a mesma altura — evita layout shift e flash de texto
        <span className={`invisible font-bold tracking-tight ${compact ? 'text-base lg:text-lg' : 'text-xl lg:text-3xl'}`}>
          &nbsp;
        </span>
      )}
    </a>
  )
}
