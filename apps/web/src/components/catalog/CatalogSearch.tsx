'use client'

// Campo de busca dentro do catálogo — filtra os produtos em tempo real enquanto digita
import { Search, X } from 'lucide-react'

interface CatalogSearchProps {
  // Texto digitado atualmente no campo
  value: string
  // Chamado toda vez que o texto muda
  onChange: (value: string) => void
}

export function CatalogSearch({ value, onChange }: CatalogSearchProps) {
  return (
    <div className="relative flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 transition-colors focus-within:border-gray-400 focus-within:bg-white">
      <Search size={16} className="shrink-0 text-gray-400" />

      <input
        type="text"
        placeholder="Buscar no catálogo..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // pr-6 reserva espaço para o botão X sem deslocar o layout
        className={`flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 ${value ? 'pr-6' : ''}`}
      />

      {/* Botão de limpar — posicionado dentro do campo para não deslocar os elementos ao redor */}
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Limpar busca"
          className="absolute right-3 text-gray-400 hover:text-gray-600"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
