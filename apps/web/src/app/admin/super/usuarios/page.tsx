'use client'

// Usuários da plataforma (super-admin) — todos os usuários de todas as lojas
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { superService } from '@/services/super.service'
import type { SuperUser } from '@esqueleton/shared'
import { Search, Users, Shield, ShieldCheck } from 'lucide-react'

export default function SuperUsuariosPage() {
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

  if (isChecking || loading) {
    return <div className="flex min-h-[50vh] items-center justify-center" />
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Usuários da plataforma</h1>
        <p className="text-sm text-gray-400">{total} usuário{total === 1 ? '' : 's'} em todas as lojas.</p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{error}</p>
      )}

      {/* Busca por e-mail */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar por e-mail"
          className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-gray-300 focus:border-gray-900"
        />
      </div>

      {/* Tabela de usuários */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
        {users.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
            <Users size={32} />
            <p className="text-sm">Nenhum usuário encontrado.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Loja</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">E-mail verificado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* Escudo cheio para super-admins da plataforma */}
                      {user.isSuperAdmin ? (
                        <ShieldCheck size={15} className="shrink-0 text-gray-900" />
                      ) : (
                        <Shield size={15} className="shrink-0 text-gray-300" />
                      )}
                      <span className="font-medium text-gray-900">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{user.store.name}</p>
                    <p className="text-xs text-gray-400">/loja/{user.store.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    {user.isSuperAdmin ? (
                      <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs font-semibold text-white">Plataforma</span>
                    ) : user.role === 'OWNER' ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Proprietário</span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">Equipe</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.emailVerified ? (
                      <span className="text-xs font-semibold text-green-600">Sim</span>
                    ) : (
                      <span className="text-xs font-semibold text-orange-500">Pendente</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-600 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-gray-500">Página {page} de {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-600 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  )
}
