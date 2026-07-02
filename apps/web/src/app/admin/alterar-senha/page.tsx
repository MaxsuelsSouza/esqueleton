'use client'

// Página de alteração de senha — acessada obrigatoriamente no primeiro login
// com senha temporária ou voluntariamente pelo menu do painel
import { Suspense } from 'react'
import { Lock, CheckCircle } from 'lucide-react'
import { useAlterarSenhaPage } from './page.hooks'

function AlterarSenhaContent() {
  const {
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
  } = useAlterarSenhaPage()

  if (isChecking) {
    return <div className="flex min-h-screen items-center justify-center" />
  }

  const inputClass =
    'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10'

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle size={24} className="text-green-600" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Senha alterada!</h1>
          <p className="text-sm text-gray-400">Redirecionando para o painel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-xs">
        {/* Ícone e título */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-900">
            <Lock size={18} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            {isForced ? 'Crie sua nova senha' : 'Alterar senha'}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {isForced
              ? 'Sua senha atual é temporária. Escolha uma nova senha para continuar.'
              : 'Digite a senha atual e escolha uma nova.'}
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Senha atual — apenas no modo voluntário */}
          {!isForced && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">
                Senha atual
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className={inputClass}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
              Nova senha
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
              Confirmar nova senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
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
            {isLoading ? '...' : 'Salvar nova senha'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Suspense necessário porque useSearchParams() precisa de um Suspense boundary
export default function AlterarSenhaPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" />}>
      <AlterarSenhaContent />
    </Suspense>
  )
}
