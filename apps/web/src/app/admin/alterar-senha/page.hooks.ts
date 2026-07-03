'use client'

// Hook que concentra toda a lógica de estado da página de alteração de senha.
// Funciona em dois modos:
//   1. Obrigatório (primeiro login com senha temporária) — não pede a senha atual
//   2. Voluntário (usuário quer trocar a senha) — pede a senha atual
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { authService } from '@/modules/auth/services/auth.service'
import { useAdminAuth } from '@/modules/auth/hooks/useAdminAuth'

export function useAlterarSenhaPage() {
  const { token, isChecking, logout } = useAdminAuth()
  const searchParams = useSearchParams()

  // Se veio do login com senha temporária, o modo é "obrigatório"
  // (o login redireciona para /admin/alterar-senha sem query param — detectamos
  //  pelo localStorage que o login acabou de acontecer)
  const isForced = searchParams.get('voluntario') !== 'true'

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    if (!isForced && !currentPassword) {
      setError('Informe a senha atual.')
      return
    }

    if (!token) return
    setIsLoading(true)

    try {
      await authService.changePassword(
        {
          currentPassword: isForced ? undefined : currentPassword,
          newPassword,
        },
        token,
      )

      setSuccess(true)
      // A troca de senha revoga todas as sessões no servidor (LGPD) —
      // inclusive esta. Após mostrar o sucesso, encerra a sessão local
      // e volta para o login com a nova senha.
      setTimeout(() => {
        logout()
      }, 1500)
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? ''
      setError(message || 'Erro ao alterar a senha. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isForced,
    isChecking,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    isLoading,
    error,
    success,
    handleSubmit,
  }
}
