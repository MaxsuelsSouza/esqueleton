'use client'

// Área da logo no canto esquerdo do cabeçalho
// Substitua a imagem ou o texto pelo logo da sua loja

interface LogoAreaProps {
  imageUrl?: string
  storeName?: string
  // Modo compacto — ativado quando o usuário rolou a página para baixo
  compact?: boolean
}

export function LogoArea({ imageUrl, storeName = 'Minha Loja', compact }: LogoAreaProps) {
  return (
    <a href="/" className="flex shrink-0 items-center gap-2">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`Logo ${storeName}`}
          className={`w-auto object-contain transition-all duration-300 ${compact ? 'h-7 lg:h-8' : 'h-10 lg:h-14'}`}
        />
      ) : (
        <span className={`font-bold tracking-tight text-gray-900 transition-all duration-300 ${compact ? 'text-base lg:text-lg' : 'text-xl lg:text-3xl'}`}>
          {storeName}
        </span>
      )}
    </a>
  )
}
