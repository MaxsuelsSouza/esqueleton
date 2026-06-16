'use client'

// Hook da página de verificação de e-mail — gerencia o estado da verificação
// Lê o token da URL e envia para a API confirmar o e-mail
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export function useVerificarEmailPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Link de verificação inválido.')
      return
    }

    async function verify() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
        const res = await fetch(`${API_URL}/api/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        if (res.ok) {
          setStatus('success')
          setMessage('E-mail verificado com sucesso!')
          // Atualiza o flag local para que o banner desapareça ao voltar ao painel
          localStorage.setItem('admin_email_verified', 'true')
        } else {
          const body = await res.json().catch(() => null)
          setStatus('error')
          setMessage(body?.message ?? 'Não foi possível verificar o e-mail. O link pode ter expirado.')
        }
      } catch {
        setStatus('error')
        setMessage('Erro de conexão. Tente novamente.')
      }
    }

    verify()
  }, [token])

  return { status, message }
}
