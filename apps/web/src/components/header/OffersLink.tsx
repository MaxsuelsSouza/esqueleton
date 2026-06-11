'use client'

// Link para a página de ofertas da loja
import { Tag } from 'lucide-react'
import { useStoreSlug } from '@/hooks/useStoreSlug'

interface OffersLinkProps {
  href?: string
}

export function OffersLink({ href }: OffersLinkProps) {
  const slug = useStoreSlug()

  return (
    <a
      href={href ?? `/loja/${slug}/ofertas`}
      className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-black"
    >
      <Tag size={16} />
      Ofertas
    </a>
  )
}
