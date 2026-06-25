'use client'

// Hook com toda a lógica de estado da página de usuários da plataforma (super-admin)
// Agrupa os usuários por loja, mostrando o proprietário como cabeçalho expansível
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/modules/auth/hooks/useAdminAuth'
import { superService } from '@/modules/super/services/super.service'
import type { SuperUser } from '@esqueleton/shared'

// Loja com o proprietário e membros da equipe agrupados
export type StoreGroup = {
  storeSlug: string
  storeName: string
  owner: SuperUser | null
  staff: SuperUser[]
}

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

  // Lojas expandidas — o slug identifica cada grupo
  const [expandedSlugs, setExpandedSlugs] = useState<Set<string>>(new Set())

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

  // Agrupa os usuários por loja — OWNER vira cabeçalho, STAFF fica dentro
  const storeGroups = useMemo((): StoreGroup[] => {
    const map = new Map<string, StoreGroup>()

    for (const user of users) {
      const slug = user.store.slug
      if (!map.has(slug)) {
        map.set(slug, {
          storeSlug: slug,
          storeName: user.store.name,
          owner: null,
          staff: [],
        })
      }
      const group = map.get(slug)!
      if (user.role === 'OWNER') {
        group.owner = user
      } else {
        group.staff.push(user)
      }
    }

    // Ordena: lojas com OWNER primeiro, depois por nome
    return Array.from(map.values()).sort((a, b) => {
      if (a.owner && !b.owner) return -1
      if (!a.owner && b.owner) return 1
      return a.storeName.localeCompare(b.storeName)
    })
  }, [users])

  function toggleExpand(slug: string) {
    setExpandedSlugs((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  function expandAll() {
    setExpandedSlugs(new Set(storeGroups.filter((g) => g.staff.length > 0).map((g) => g.storeSlug)))
  }

  function collapseAll() {
    setExpandedSlugs(new Set())
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handlePreviousPage = () => setPage((p) => Math.max(1, p - 1))
  const handleNextPage = () => setPage((p) => Math.min(totalPages, p + 1))

  return {
    storeGroups,
    total,
    page,
    search,
    loading,
    error,
    isChecking,
    totalPages,
    expandedSlugs,
    toggleExpand,
    expandAll,
    collapseAll,
    handleSearchChange,
    handlePreviousPage,
    handleNextPage,
  }
}
