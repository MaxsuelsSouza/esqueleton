'use client'

// Barra de pesquisa — usada no cabeçalho (desktop e mobile expandido)
import { Search } from 'lucide-react'
import { useState } from 'react'

interface SearchBarProps {
  onSearch?: (term: string) => void
  autoFocus?: boolean
}

export function SearchBar({ onSearch, autoFocus }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('')

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && onSearch) {
      onSearch(searchTerm)
    }
  }

  return (
    <div className="flex w-full items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 transition-colors focus-within:border-gray-400 focus-within:bg-white">
      <Search size={16} className="shrink-0 text-gray-400" />
      <input
        type="text"
        placeholder="Pesquisar produtos..."
        value={searchTerm}
        autoFocus={autoFocus}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400 md:w-48"
      />
    </div>
  )
}
