'use client'

// Rodapé da loja — fundo com degradê da cor do tema (embaixo) até transparente (cima)
import { useStoreProfile } from '@/contexts/store-profile-context'

export function Footer() {
  const { profile } = useStoreProfile()
  const themeColor = profile.themeColor ?? '#000000'

  return (
    <footer
      className="mt-auto w-full pb-8 pt-40 text-center text-xs text-gray-400"
      style={{
        // Degradê suave: transparente no topo, cor do tema com 20% de opacidade na base
        background: `linear-gradient(to bottom, ${themeColor}00, ${themeColor}80)`,
      }}
    >
      {profile.storeName && (
        <p className="font-medium text-gray-500">{profile.storeName}</p>
      )}
      <p className="mt-1">© {new Date().getFullYear()} Todos os direitos reservados.</p>
    </footer>
  )
}
