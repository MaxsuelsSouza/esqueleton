'use client'

// Área da logo no canto esquerdo do cabeçalho
// Substitua a imagem ou o texto pelo logo da sua loja

interface LogoAreaProps {
  imageUrl?: string
  storeName?: string
}

export function LogoArea({ imageUrl, storeName = 'Minha Loja' }: LogoAreaProps) {
  return (
    <a href="/" className="flex shrink-0 items-center gap-2">
      {imageUrl ? (
        <img src={imageUrl} alt={`Logo ${storeName}`} className="h-10 w-auto object-contain" />
      ) : (
        <span className="text-xl font-bold tracking-tight text-gray-900">{storeName}</span>
      )}
    </a>
  )
}
