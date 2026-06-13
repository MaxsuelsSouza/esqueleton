'use client'

// Tela de login da área administrativa
// Também permite criar uma loja nova ("Criar minha loja") com nome, endereço, e-mail e senha
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/services/auth.service'

// Converte o nome da loja em um endereço (slug): minúsculas, sem acentos, hífens
// Ex: "Perfumaria Ana" → "perfumaria-ana"
function suggestSlugFromName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove os acentos que o normalize('NFD') separa das letras
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // troca tudo que não é letra ou número por hífen
    .replace(/^-+|-+$/g, '') // remove hífens sobrando nas pontas
}

// Guarda o token e os dados da loja no navegador — usados pelo painel admin.
// role e isSuperAdmin não são salvos aqui: o hook useAdminAuth lê direto do
// payload JWT (assinado pelo servidor) para evitar adulteração via localStorage.
function saveSession(data: {
  token: string
  emailVerified: boolean
  store: { slug: string; name: string }
}) {
  localStorage.setItem('admin_token', data.token)
  localStorage.setItem('admin_store_slug', data.store.slug)
  localStorage.setItem('admin_store_name', data.store.name)
  localStorage.setItem('admin_email_verified', String(data.emailVerified))
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [storeName, setStoreName] = useState('')
  const [storeSlug, setStoreSlug] = useState('')
  // Marca se o usuário editou o endereço manualmente — aí paramos de sugerir automaticamente
  const [slugEditedManually, setSlugEditedManually] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  function handleStoreNameChange(value: string) {
    setStoreName(value)
    // Sugere o endereço automaticamente a partir do nome, enquanto não foi editado à mão
    if (!slugEditedManually) {
      setStoreSlug(suggestSlugFromName(value))
    }
  }

  function handleStoreSlugChange(value: string) {
    setSlugEditedManually(true)
    // Normaliza o que for digitado para manter o formato de endereço válido
    setStoreSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (mode === 'register') {
        // Validações simples antes de enviar
        if (!storeName.trim()) {
          setError('Informe o nome da sua loja.')
          return
        }
        if (!storeSlug.trim()) {
          setError('Informe o endereço da sua loja.')
          return
        }
        // Cria a loja nova com o primeiro usuário
        await authService.registerStore({
          email,
          password,
          storeName: storeName.trim(),
          storeSlug: storeSlug.trim(),
        })
      }

      // Faz login (após o cadastro, entra automaticamente)
      const loginResponse = await authService.login({ email, password })
      saveSession(loginResponse)
      router.replace('/admin/produtos')
    } catch (err: unknown) {
      if (mode === 'register') {
        const message = (err as { message?: string })?.message ?? ''
        setError(message.includes('409') || message.includes('cadastrado') || message.includes('uso')
          ? 'Este e-mail ou endereço de loja já está em uso.'
          : message || 'Erro ao criar a loja. Tente novamente.')
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
