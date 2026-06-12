'use client'

// Gerencia a autenticação da área administrativa
// Lê o token e os dados de papel/verificação salvos no navegador
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { UserRole } from '@esqueleton/shared'

export function useAdminAuth() {
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [emailVerified, setEmailVerified] = useState(true)
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
      setRole((localStorage.getItem('admin_role') as UserRole) ?? 'STAFF')
      setEmailVerified(localStorage.getItem('admin_email_verified') !== 'false')
      setIsChecking(false)
    }
  }, [pathname, router])

  function logout() {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_store_slug')
    localStorage.removeItem('admin_store_name')
    localStorage.removeItem('admin_role')
    localStorage.removeItem('admin_email_verified')
    // Navegação dura — garante que todo estado é limpo
    window.location.href = '/admin/login'
  }

  // Atalhos para verificações de papel
  const isOwner = role === 'OWNER'

  return { token, role, isOwner, emailVerified, isChecking, logout }
}
