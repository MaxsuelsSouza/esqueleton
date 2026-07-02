// Cliente HTTP base — todas as chamadas para a API passam por aqui
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// Sessão do admin expirou ou o token foi rejeitado — limpa o navegador e manda
// para o login com aviso, em vez de deixar cada tela falhar com erro genérico
function handleAdminSessionExpired() {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_store_slug')
  localStorage.removeItem('admin_store_name')
  localStorage.removeItem('admin_email_verified')
  window.location.href = '/admin/login?sessao=expirada'
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  // 401 numa chamada autenticada dentro do painel = sessão expirada
  if (res.status === 401 && typeof window !== 'undefined') {
    const sentToken = Boolean((init?.headers as Record<string, string> | undefined)?.Authorization)
    if (sentToken && window.location.pathname.startsWith('/admin')) {
      handleAdminSessionExpired()
    }
  }

  if (!res.ok) {
    // Tenta ler a mensagem de erro retornada pela API.
    // O status HTTP vai junto no erro — quem chama pode diferenciar, por exemplo,
    // o 503 de loja indisponível de uma falha de rede comum.
    const body = await res.json().catch(() => null)
    const message = body?.message ?? `${res.status} ${res.statusText}`
    const error = new Error(message) as Error & { status?: number }
    error.status = res.status
    throw error
  }

  // 204 No Content — resposta válida sem corpo (ex: DELETE bem-sucedido)
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }),

  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }),

  put: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }),

  patch: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }),

  delete: <T>(path: string, token?: string) =>
    request<T>(path, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }),
}
