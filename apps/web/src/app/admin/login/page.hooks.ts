'use client'

// Hook que concentra toda a lógica de estado e callbacks da página de login/cadastro
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/modules/auth/services/auth.service'

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

export function useLoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [storeName, setStoreName] = useState('')
  const [storeSlug, setStoreSlug] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
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
        if (!whatsapp.trim()) {
          setError('Informe o WhatsApp para receber pedidos.')
          return
        }
        // Cria a loja nova com o primeiro usuário
        await authService.registerStore({
          email,
          password,
          storeName: storeName.trim(),
          storeSlug: storeSlug.trim(),
          whatsapp: whatsapp.trim().replace(/\D/g, ''),
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

  return {
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
  }
}
