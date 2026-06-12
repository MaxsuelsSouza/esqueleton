'use client'

// Página de gestão da equipe — apenas o OWNER pode acessar
// Lista os usuários da loja, permite convidar (criar) e remover membros
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { usersService } from '@/services/users.service'
import { authService } from '@/services/auth.service'
import type { User } from '@esqueleton/shared'
import { Trash2, UserPlus, Shield, Users } from 'lucide-react'

export default function UsuariosPage() {
  const { token, isOwner, isChecking } = useAdminAuth()
  const router = useRouter()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estado do formulário de convite
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // ID do usuário sendo removido — para desabilitar o botão enquanto aguarda
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    if (!token) return
    try {
      const data = await usersService.list(token)
      setUsers(data)
    } catch {
      setError('Não foi possível carregar a equipe.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!isChecking && !isOwner) {
      router.replace('/admin/dashboard')
      return
    }
    if (token) loadUsers()
  }, [token, isChecking, isOwner, router, loadUsers])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setInviteError(null)
    setInviting(true)

    try {
      await authService.register({ email: inviteEmail, password: invitePassword }, token)
      setInviteEmail('')
      setInvitePassword('')
      setShowInvite(false)
      await loadUsers()
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? ''
      setInviteError(
        message.includes('409') || message.includes('cadastrado') || message.includes('uso')
          ? 'Este e-mail já está em uso.'
          : message || 'Erro ao convidar. Tente novamente.'
      )
    } finally {
      setInviting(false)
    }
  }

  async function handleDelete(userId: string) {
    if (!token) return
    if (!confirm('Tem certeza que deseja remover este membro?')) return

    setDeletingId(userId)
    try {
      await usersService.delete(userId, token)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? ''
      alert(message || 'Erro ao remover o membro.')
    } finally {
      setDeletingId(null)
    }
  }

  if (isChecking || loading) {
    return <div className="flex min-h-[50vh] items-center justify-center" />
  }

  const inputClass =
    'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10'

  return (
    <div className="mx-auto max-w-2xl">
      {/* Cabeçalho com título e botão de convidar */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Equipe</h1>
          <p className="text-sm text-gray-400">Gerencie quem tem acesso ao painel da sua loja.</p>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700"
        >
          <UserPlus size={16} />
          Convidar
        </button>
      </div>

      {/* Formulário de convite — aparece ao clicar em "Convidar" */}
      {showInvite && (
        <form onSubmit={handleInvite} className="mb-6 rounded-2xl border border-gray-100 bg-white p-5">
          <p className="mb-4 text-sm font-medium text-gray-700">Convidar novo membro</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="E-mail do membro"
              required
              className={inputClass}
            />
            <input
              type="password"
              value={invitePassword}
              onChange={(e) => setInvitePassword(e.target.value)}
              placeholder="Senha temporária"
              required
              minLength={8}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={inviting}
              className="shrink-0 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
            >
              {inviting ? '...' : 'Enviar'}
            </button>
          </div>
          {inviteError && (
            <p className="mt-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{inviteError}</p>
          )}
        </form>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{error}</p>
      )}

      {/* Lista de membros da equipe */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        {users.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
            <Users size={32} />
            <p className="text-sm">Nenhum membro encontrado.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {users.map((user) => (
              <li key={user.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  {/* Ícone de escudo para o OWNER */}
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    user.role === 'OWNER' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Shield size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.email}</p>
                    <p className="text-xs text-gray-400">
                      {user.role === 'OWNER' ? 'Proprietário' : 'Equipe'}
                      {user.emailVerified === false && ' · E-mail não verificado'}
                    </p>
                  </div>
                </div>

                {/* Botão de remover — não aparece para o OWNER (não pode remover a si mesmo) */}
                {user.role !== 'OWNER' && (
                  <button
                    onClick={() => handleDelete(user.id)}
                    disabled={deletingId === user.id}
                    className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                    title="Remover membro"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
