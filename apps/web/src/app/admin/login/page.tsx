'use client'

// Tela de login da área administrativa
// Também permite criar uma loja nova ("Criar minha loja") com nome, endereço, e-mail e senha
import Link from 'next/link'
import { useLoginPage } from './page.hooks'

export default function AdminLoginPage() {
  const {
    mode,
    email,
    setEmail,
    password,
    setPassword,
    storeName,
    storeSlug,
    whatsapp,
    setWhatsapp,
    error,
    isLoading,
    handleStoreNameChange,
    handleStoreSlugChange,
    handleSubmit,
    switchMode,
  } = useLoginPage()

  const inputClass =
    'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10'

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-xs">

        {/* Logo / marca */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-900">
            <span className="text-sm font-bold text-white">A</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            {mode === 'login' ? 'Bem-vindo de volta' : 'Criar minha loja'}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {mode === 'login' ? 'Entre na área administrativa' : 'Monte o catálogo da sua loja em minutos'}
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">

          {/* Campos da loja — apenas no modo de cadastro */}
          {mode === 'register' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="storeName" className="text-sm font-medium text-gray-700">
                  Nome da loja
                </label>
                <input
                  id="storeName"
                  type="text"
                  value={storeName}
                  onChange={(e) => handleStoreNameChange(e.target.value)}
                  placeholder="Ex: Perfumaria Ana"
                  required
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="storeSlug" className="text-sm font-medium text-gray-700">
                  Endereço da loja
                </label>
                <input
                  id="storeSlug"
                  type="text"
                  value={storeSlug}
                  onChange={(e) => handleStoreSlugChange(e.target.value)}
                  placeholder="perfumaria-ana"
                  required
                  className={inputClass}
                />
                {/* Mostra como ficará o link público da loja */}
                {storeSlug && (
                  <p className="text-xs text-gray-400">Sua loja ficará em /loja/{storeSlug}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="whatsapp" className="text-sm font-medium text-gray-700">
                  WhatsApp
                </label>
                <input
                  id="whatsapp"
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                  className={inputClass}
                />
                <p className="text-xs text-gray-400">Seus clientes enviam pedidos por este número</p>
              </div>
            </>
          )}

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
              className={inputClass}
            />
            {mode === 'login' && (
              <Link
                href="/admin/esqueci-senha"
                className="self-end text-xs text-gray-400 transition-colors hover:text-gray-900"
              >
                Esqueci minha senha
              </Link>
            )}
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
              : mode === 'login' ? 'Entrar' : 'Criar loja e entrar'}
          </button>
        </form>

        {/* Alternar modo */}
        <p className="mt-6 text-center text-sm text-gray-400">
          {mode === 'login' ? 'Ainda não tem uma loja?' : 'Já tem uma conta?'}{' '}
          <button
            onClick={switchMode}
            className="font-medium text-gray-600 hover:text-gray-900"
          >
            {mode === 'login' ? 'Criar minha loja' : 'Entrar'}
          </button>
        </p>

      </div>
    </div>
  )
}
