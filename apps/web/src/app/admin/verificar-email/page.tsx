'use client'

// Página de verificação de e-mail — o usuário chega aqui ao clicar no link do e-mail
// Lê o token da URL e envia para a API confirmar o e-mail
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function VerificarEmailPage() {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-xs text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={40} className="animate-spin text-gray-400" />
            <p className="text-sm text-gray-500">Verificando seu e-mail...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle2 size={48} className="text-green-500" />
            <p className="text-lg font-semibold text-gray-900">{message}</p>

            {/* Aviso da ativação — a loja funciona 7 dias de teste e depois
                sai do ar para os clientes até a assinatura ser ativada */}
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-left">
              <p className="text-sm font-semibold text-orange-800">
                Sua loja ainda não está ativada
              </p>
              <p className="mt-1 text-sm text-orange-700">
                Você tem <strong>7 dias de teste</strong> com tudo liberado. Depois disso,
                o seu catálogo sai do ar para os clientes até você ativar a assinatura.
              </p>
            </div>

            <Link
              href="/admin/assinatura"
              className="inline-block w-full rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700"
            >
              Ativar minha loja
            </Link>
            <Link
              href="/admin/dashboard"
              className="text-sm font-medium text-gray-500 transition hover:text-gray-900"
            >
              Deixar para depois — ir para o painel
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <XCircle size={48} className="text-red-400" />
            <p className="text-lg font-semibold text-gray-900">{message}</p>
            <Link
              href="/admin/login"
              className="mt-2 inline-block rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700"
            >
              Ir para o login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
