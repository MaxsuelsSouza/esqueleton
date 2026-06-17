'use client'

// Variante compacta da busca — exibe apenas um botão com ícone de lupa.
// Ao clicar, o campo de texto expande com transição CSS suave.
import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'

interface CatalogSearchCompactProps {
  // Texto digitado atualmente no campo
  value: string
  // Chamado toda vez que o texto muda
  onChange: (value: string) => void
}

export function CatalogSearchCompact({ value, onChange }: CatalogSearchCompactProps) {
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Foca o input automaticamente ao expandir
  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [expanded])

  // Fecha o campo se estiver vazio ao perder foco
  function handleBlur() {
    if (!value) {
      setExpanded(false)
    }
  }

  function handleToggle() {
    if (expanded && value) {
      // Se já está expandido e tem texto, limpa o campo
      onChange('')
    } else {
      setExpanded(!expanded)
    }
  }

  return (
    <div className="relative flex items-center">
      {/* Campo de busca — largura transiciona entre 0 e 100% */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? 'w-full opacity-100' : 'w-0 opacity-0'
        }`}
      >
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-gray-400 focus-within:bg-white">
          <Search size={16} className="shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={handleBlur}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
          {value && (
            <button
              onClick={() => onChange('')}
              aria-label="Limpar busca"
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Botão de lupa — visível quando colapsado */}
      {!expanded && (
        <button
          onClick={handleToggle}
          aria-label="Abrir busca"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 transition-colors hover:bg-gray-100"
        >
          <Search size={18} />
        </button>
      )}
    </div>
  )
}
