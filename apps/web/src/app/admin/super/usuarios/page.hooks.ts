'use client'

// Hook com toda a lógica de estado da página de usuários da plataforma (super-admin)
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/modules/auth/hooks/useAdminAuth'
import { superService } from '@/modules/super/services/super.service'
import type { SuperUser } from '@esqueleton/shared'

export function useSuperUsuariosPage() {
  const { token, isSuperAdmin, isChecking } = useAdminAuth()
  const router = useRouter()

  const [users, setUsers] = useState<SuperUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    if (!token) return
    try {
      const result = await superService.listUsers(token, { page, search: search || undefined })
      setUsers(result.data)
      setTotal(result.total)
      setPerPage(result.perPage)
    } catch {
      setError('Não foi possível carregar os usuários.')
    } finally {
      setLoading(false)
    }
  }, [token, page, search])

  useEffect(() => {
    if (!isChecking && !isSuperAdmin) {
      router.replace('/admin/dashboard')
      return
    }
    if (token) loadUsers()
  }, [token, isChecking, isSuperAdmin, router, loadUsers])

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handlePreviousPage = () => setPage((p) => Math.max(1, p - 1))
  const handleNextPage = () => setPage((p) => Math.min(totalPages, p + 1))

  return {
    users,
    total,
    page,
    search,
    loading,
    error,
    isChecking,
    totalPages,
    handleSearchChange,
    handlePreviousPage,
    handleNextPage,
  }
}
