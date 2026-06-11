'use client'

// Gerencia a autenticação da área administrativa
// Lê o token salvo no navegador e redireciona para o login se não houver
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function useAdminAuth() {
  const [token, setToken] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Roda toda vez que o pathname muda — necessário porque o layout não remonta entre rotas
  useEffect(() => {
    setIsChecking(true)
    const saved = localStorage.getItem('admin_token')
    if (!saved) {
      router.replace('/admin/login')
    } else {
      setToken(saved)
      setIsChecking(false)
    }
  }, [pathname, router])

  function logout() {
    localStorage.removeItem('admin_token')
    // Remove também os dados da loja salvos no login
    localStorage.removeItem('admin_store_slug')
    localStorage.removeItem('admin_store_name')
    router.replace('/admin/login')
  }

  return { token, isChecking, logout }
}
