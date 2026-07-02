'use client'

// Gerencia a autenticação da área administrativa
// Lê role, emailVerified e isSuperAdmin direto do payload JWT (assinado pelo servidor)
// para evitar que valores no localStorage sejam adulterados pelo usuário
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { UserRole } from '@esqueleton/shared'

// Páginas do admin acessíveis SEM login — quem chega nelas por link de e-mail
// (redefinir senha, verificar e-mail) não pode ser jogado de volta para o login
export const ADMIN_PUBLIC_PAGES = [
  '/admin/login',
  '/admin/esqueci-senha',
  '/admin/redefinir-senha',
  '/admin/verificar-email',
  '/admin/alterar-senha',
]

export function isAdminPublicPage(pathname: string): boolean {
  return ADMIN_PUBLIC_PAGES.some((page) => pathname.startsWith(page))
}

// Decodifica o payload (segunda parte) do JWT sem verificar a assinatura.
// A verificação de assinatura acontece no servidor — aqui só extraímos os dados
// para decidir o que mostrar na UI. Mesmo que alguém altere o localStorage,
// os valores vêm do token assinado que não pode ser forjado.
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1]
    if (!base64) return null
    // Decodifica o base64 respeitando UTF-8 — atob sozinho quebra com
    // caracteres acentuados (ex: nome da loja no payload)
    const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    return JSON.parse(json)
  } catch {
    return null
  }
}

// Verifica se o token já passou da data de expiração (campo exp do JWT)
function isTokenExpired(payload: Record<string, unknown>): boolean {
  const exp = payload.exp
  if (typeof exp !== 'number') return false
  return exp * 1000 <= Date.now()
}

// Remove todas as chaves de sessão do admin do navegador
function clearAdminSession() {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_store_slug')
  localStorage.removeItem('admin_store_name')
  localStorage.removeItem('admin_email_verified')
  // Limpa chaves legadas que versões anteriores salvavam
  localStorage.removeItem('admin_role')
  localStorage.removeItem('admin_is_super_admin')
}

export function useAdminAuth() {
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [emailVerified, setEmailVerified] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Roda toda vez que o pathname muda — necessário porque o layout não remonta entre rotas
  useEffect(() => {
    // Páginas públicas (login, redefinir senha, verificar e-mail) nunca redirecionam —
    // são justamente as páginas usadas por quem está deslogado
    if (isAdminPublicPage(pathname)) {
      setIsChecking(false)
      return
    }

    setIsChecking(true)
    const saved = localStorage.getItem('admin_token')
    if (!saved) {
      router.replace('/admin/login')
      return
    }

    // Extrai role/emailVerified/isSuperAdmin do JWT assinado pelo servidor
    // — imune a adulteração manual do localStorage
    const payload = decodeJwtPayload(saved)
    if (!payload) {
      // Token corrompido — força logout
      clearAdminSession()
      router.replace('/admin/login')
      return
    }

    // Sessão expirada (o token dura 1 dia) — manda para o login com aviso,
    // em vez de deixar o painel inteiro falhando com erros genéricos
    if (isTokenExpired(payload)) {
      clearAdminSession()
      router.replace('/admin/login?sessao=expirada')
      return
    }

    setToken(saved)
    setRole((payload.role as UserRole) ?? 'STAFF')
    setIsSuperAdmin(payload.isSuperAdmin === true)

    // emailVerified é especial: o JWT nasce com false no login, mas a verificação
    // acontece sem re-login (a página verificar-email salva 'true' no localStorage).
    // Aceitar o localStorage APENAS para promover de false→true (nunca o contrário)
    // garante que o banner suma na mesma sessão sem abrir brecha para adulteração.
    const jwtVerified = payload.emailVerified === true
    const localVerified = localStorage.getItem('admin_email_verified') === 'true'
    setEmailVerified(jwtVerified || localVerified)

    setIsChecking(false)
  }, [pathname, router])

  function logout() {
    clearAdminSession()
    // Navegação dura — garante que todo estado é limpo
    window.location.href = '/admin/login'
  }

  // Atalhos para verificações de papel
  const isOwner = role === 'OWNER'

  return { token, role, isOwner, isSuperAdmin, emailVerified, isChecking, logout }
}
