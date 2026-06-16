'use client'

// Hook que concentra toda a lógica de estado e callbacks da página de redefinição de senha
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { authService } from '@/modules/auth/services/auth.service'

export function useRedefinirSenhaPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    setIsLoading(true)

    try {
      await authService.resetPassword(token, password)
      setSuccess(true)
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? ''
      setError(message || 'Erro ao redefinir a senha. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    token,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    success,
    isLoading,
    error,
    handleSubmit,
  }
}
