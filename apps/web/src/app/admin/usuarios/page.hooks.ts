'use client'

// Hook que concentra toda a lógica de estado e callbacks da página de gestão da equipe
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/modules/auth/hooks/useAdminAuth'
import { usersService } from '@/modules/users/services/users.service'
import { authService } from '@/modules/auth/services/auth.service'
import type { User } from '@esqueleton/shared'

export function useUsuariosPage() {
  const { token, isOwner, isChecking } = useAdminAuth()
  const router = useRouter()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estado do formulário de convite
  const [showInvite, setShowInvite] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // ID do usuário sendo removido — para desabilitar o botão enquanto aguarda
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Senha temporária gerada ao resetar — exibida uma única vez para o OWNER copiar
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [generatedPasswordUserName, setGeneratedPasswordUserName] = useState<string | null>(null)
  // ID do usuário cuja senha está sendo resetada
  const [resettingId, setResettingId] = useState<string | null>(null)

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
      await authService.register(
        { email: inviteEmail, password: invitePassword, name: inviteName.trim() || undefined },
        token,
      )
      setInviteName('')
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

  async function handleResetPassword(userId: string) {
    if (!token) return
    if (!confirm('Tem certeza que deseja resetar a senha deste membro? Ele precisará trocar a senha no próximo login.')) return

    const user = users.find((u) => u.id === userId)
    setResettingId(userId)
    try {
      const result = await usersService.resetPassword(userId, token)
      setGeneratedPassword(result.temporaryPassword)
      setGeneratedPasswordUserName(user?.name || user?.email || 'Membro')
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? ''
      alert(message || 'Erro ao resetar a senha.')
    } finally {
      setResettingId(null)
    }
  }

  function dismissGeneratedPassword() {
    setGeneratedPassword(null)
    setGeneratedPasswordUserName(null)
  }

  return {
    users,
    loading,
    error,
    isChecking,
    showInvite,
    setShowInvite,
    inviteName,
    setInviteName,
    inviteEmail,
    setInviteEmail,
    invitePassword,
    setInvitePassword,
    inviting,
    inviteError,
    deletingId,
    generatedPassword,
    generatedPasswordUserName,
    resettingId,
    handleInvite,
    handleDelete,
    handleResetPassword,
    dismissGeneratedPassword,
  }
}
