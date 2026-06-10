'use client'

// Link para a página de ofertas
import { Tag } from 'lucide-react'

interface OffersLinkProps {
  href?: string
}

export function OffersLink({ href = '/ofertas' }: OffersLinkProps) {
  return (
    <a
      href={href}
      className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-black"
    >
      <Tag size={16} />
      Ofertas
    </a>
  )
}
