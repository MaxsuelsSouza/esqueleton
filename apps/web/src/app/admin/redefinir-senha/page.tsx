'use client'

// Página de redefinição de senha — o usuário chega aqui pelo link do e-mail.
// Lê o token da URL (?token=xxx) e pede a nova senha.
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/services/auth.service'

export default function ResetPasswordPage() {
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

  const inputClass =
    'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10'

  // Token ausente — o link está incompleto
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-xs text-center">
          <div className="rounded-xl bg-red-50 px-4 py-4 text-sm text-red-500">
            Link inválido. Peça um novo link de redefinição de senha.
          </div>
          <Link
            href="/admin/esqueci-senha"
            className="mt-6 inline-block text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Pedir novo link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-xs">

        {/* Logo / marca */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-900">
            <span className="text-sm font-bold text-white">E</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Nova senha</h1>
          <p className="mt-1 text-sm text-gray-400">
            Escolha uma nova senha para sua conta.
          </p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="rounded-xl bg-green-50 px-4 py-4 text-sm text-green-700">
              Senha redefinida com sucesso! Faça login com a nova senha.
            </div>
            <Link
              href="/admin/login"
              className="mt-6 inline-block rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700"
            >
              Ir para o login
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Nova senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirmar senha
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={inputClass}
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-1 w-full rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-50"
              >
                {isLoading ? '...' : 'Redefinir senha'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-400">
              <Link href="/admin/login" className="font-medium text-gray-600 hover:text-gray-900">
                Voltar para o login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
