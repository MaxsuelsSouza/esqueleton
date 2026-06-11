'use client'

// Tela de login da área administrativa
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/services/auth.service'

export default function AdminLoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (mode === 'register') {
        await authService.register({ email, password })
      }
      const { token } = await authService.login({ email, password })
      localStorage.setItem('admin_token', token)
      router.replace('/admin/produtos')
    } catch (err: unknown) {
      if (mode === 'register') {
        const message = (err as { message?: string })?.message ?? ''
        setError(message.includes('409') || message.includes('cadastrado')
          ? 'Este e-mail já possui uma conta.'
          : 'Erro ao criar conta. Tente novamente.')
      } else {
        setError('E-mail ou senha inválidos.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  function switchMode() {
    setMode((m) => (m === 'login' ? 'register' : 'login'))
    setError(null)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-xs">

        {/* Logo / marca */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-900">
            <span className="text-sm font-bold text-white">A</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            {mode === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {mode === 'login' ? 'Entre na área administrativa' : 'Configure o primeiro acesso'}
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={mode === 'register' ? 8 : 1}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
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
            {isLoading
              ? '...'
              : mode === 'login' ? 'Entrar' : 'Criar conta e entrar'}
          </button>
        </form>

        {/* Alternar modo */}
        <p className="mt-6 text-center text-sm text-gray-400">
          {mode === 'login' ? 'Primeiro acesso?' : 'Já tem uma conta?'}{' '}
          <button
            onClick={switchMode}
            className="font-medium text-gray-600 hover:text-gray-900"
          >
            {mode === 'login' ? 'Criar conta' : 'Entrar'}
          </button>
        </p>

      </div>
    </div>
  )
}
