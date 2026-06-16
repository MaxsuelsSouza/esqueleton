'use client'

// Hook que gerencia o estado e as ações da página "Esqueci minha senha".
import { useState } from 'react'
import { authService } from '@/modules/auth/services/auth.service'

export function useEsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await authService.forgotPassword(email.trim())
      setSent(true)
    } catch {
      setError('Erro ao enviar o e-mail. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    email,
    setEmail,
    sent,
    isLoading,
    error,
    handleSubmit,
  }
}
