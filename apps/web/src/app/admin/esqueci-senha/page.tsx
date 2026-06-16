'use client'

// Página "Esqueci minha senha" — o usuário informa o e-mail e recebe
// um link para criar uma nova senha.
import Link from 'next/link'
import { useEsqueciSenhaPage } from './page.hooks'

export default function ForgotPasswordPage() {
  const { email, setEmail, sent, isLoading, error, handleSubmit } = useEsqueciSenhaPage()

  const inputClass =
    'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10'

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-xs">

        {/* Logo / marca */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-900">
            <span className="text-sm font-bold text-white">E</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Esqueci minha senha</h1>
          <p className="mt-1 text-sm text-gray-400">
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        {sent ? (
          // Mensagem de sucesso — exibida independente de o e-mail existir ou não
          <div className="text-center">
            <div className="rounded-xl bg-green-50 px-4 py-4 text-sm text-green-700">
              Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.
              Verifique sua caixa de entrada e a pasta de spam.
            </div>
            <Link
              href="/admin/login"
              className="mt-6 inline-block text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
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
                {isLoading ? '...' : 'Enviar link de redefinição'}
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
