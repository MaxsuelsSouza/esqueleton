'use client'

// Alternador do tipo de exibição dos produtos
// Um botão que abre um dropdown com as opções: grade e lista
import { useState, useRef, useEffect } from 'react'
import { LayoutGrid, LayoutList } from 'lucide-react'
import type { DisplayMode } from '@esqueleton/shared'

interface DisplayToggleProps {
  current: DisplayMode
  onChange: (mode: DisplayMode) => void
}

// Opções disponíveis de exibição
const DISPLAY_OPTIONS: { mode: DisplayMode; label: string; icon: React.ReactNode }[] = [
  { mode: 'grid', label: 'Grade', icon: <LayoutGrid size={15} /> },
  { mode: 'list', label: 'Lista', icon: <LayoutList size={15} /> },
]

export function DisplayToggle({ current, onChange }: DisplayToggleProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentOption = DISPLAY_OPTIONS.find((o) => o.mode === current)!

  // Fecha o dropdown ao clicar fora do componente
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(mode: DisplayMode) {
    onChange(mode)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative shrink-0">

      {/* Botão principal — mostra o modo atual e abre o dropdown */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Alterar tipo de exibição"
        aria-expanded={isOpen}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:border-gray-400 hover:text-black"
      >
        {currentOption.icon}
      </button>

      {/* Dropdown com as opções de exibição */}
      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg">
          {DISPLAY_OPTIONS.map((option) => (
            <button
              key={option.mode}
              onClick={() => handleSelect(option.mode)}
              className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                current === option.mode
                  ? 'font-medium text-black'
                  : 'text-gray-600'
              }`}
            >
              {option.icon}
              {option.label}
              {/* Indicador visual do modo ativo */}
              {current === option.mode && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-black" />
              )}
            </button>
          ))}
        </div>
      )}

    </div>
  )
}
