'use client'

// Usuários da plataforma (super-admin) — visualização em cadeia por loja
// Cada loja mostra o proprietário como cabeçalho, expandível para ver a equipe
import { Search, Users, Shield, ShieldCheck, ChevronRight, ChevronDown, User } from 'lucide-react'
import { useSuperUsuariosPage } from './page.hooks'
import type { StoreGroup } from './page.hooks'
import type { SuperUser } from '@esqueleton/shared'

export default function SuperUsuariosPage() {
  const {
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
  } = useSuperUsuariosPage()

  if (isChecking || loading) {
    return <div className="flex min-h-[50vh] items-center justify-center" />
  }

  const hasAnyStaff = storeGroups.some((g) => g.staff.length > 0)

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Usuários da plataforma</h1>
        <p className="text-sm text-gray-400">{total} usuário{total === 1 ? '' : 's'} em todas as lojas.</p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{error}</p>
      )}

      {/* Busca e ações */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por e-mail"
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-gray-300 focus:border-gray-900"
          />
        </div>
        {hasAnyStaff && (
          <button
            onClick={expandedSlugs.size > 0 ? collapseAll : expandAll}
            className="shrink-0 rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-medium text-gray-500 transition hover:bg-gray-50"
          >
            {expandedSlugs.size > 0 ? 'Recolher tudo' : 'Expandir tudo'}
          </button>
        )}
      </div>

      {/* Lista agrupada por loja */}
      <div className="space-y-2">
        {storeGroups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white py-12 text-gray-400">
            <Users size={32} />
            <p className="text-sm">Nenhum usuário encontrado.</p>
          </div>
        ) : (
          storeGroups.map((group) => (
            <StoreGroupCard
              key={group.storeSlug}
              group={group}
              isExpanded={expandedSlugs.has(group.storeSlug)}
              onToggle={() => toggleExpand(group.storeSlug)}
            />
          ))
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            onClick={handlePreviousPage}
            disabled={page <= 1}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-600 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-gray-500">Página {page} de {totalPages}</span>
          <button
            onClick={handleNextPage}
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

// Card de uma loja — mostra o proprietário e, quando expandido, os membros da equipe
function StoreGroupCard({
  group,
  isExpanded,
  onToggle,
}: {
  group: StoreGroup
  isExpanded: boolean
  onToggle: () => void
}) {
  const { owner, staff, storeName, storeSlug } = group
  const hasStaff = staff.length > 0

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
      {/* Cabeçalho — proprietário da loja */}
      <button
        onClick={hasStaff ? onToggle : undefined}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
          hasStaff ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'
        }`}
      >
        {/* Seta de expansão — só aparece se tem equipe */}
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          {hasStaff ? (
            isExpanded ? (
              <ChevronDown size={16} className="text-gray-400" />
            ) : (
              <ChevronRight size={16} className="text-gray-400" />
            )
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-gray-200" />
          )}
        </span>

        {/* Info do proprietário */}
        <div className="flex flex-1 items-center gap-3 min-w-0">
          {owner ? (
            <>
              {owner.isSuperAdmin ? (
                <ShieldCheck size={15} className="shrink-0 text-gray-900" />
              ) : (
                <Shield size={15} className="shrink-0 text-blue-500" />
              )}
              <span className="truncate font-medium text-gray-900">{owner.email}</span>
              <RoleBadge user={owner} />
              <EmailBadge verified={owner.emailVerified} />
            </>
          ) : (
            <>
              <Shield size={15} className="shrink-0 text-gray-300" />
              <span className="truncate text-gray-400 italic">Sem proprietário</span>
            </>
          )}
        </div>

        {/* Loja + contagem de equipe */}
        <div className="shrink-0 text-right">
          <p className="text-sm font-medium text-gray-600">{storeName}</p>
          <p className="text-xs text-gray-400">
            /loja/{storeSlug}
            {hasStaff && (
              <span className="ml-1.5">
                · {staff.length} {staff.length === 1 ? 'membro' : 'membros'}
              </span>
            )}
          </p>
        </div>
      </button>

      {/* Equipe — aparece quando expandido */}
      {isExpanded && hasStaff && (
        <div className="border-t border-gray-50">
          {staff.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 border-b border-gray-50 px-4 py-2.5 last:border-b-0 hover:bg-gray-50/50"
            >
              {/* Indentação visual — alinha com o conteúdo do owner */}
              <span className="h-5 w-5 shrink-0" />
              <div className="flex flex-1 items-center gap-3 min-w-0 pl-0.5">
                <User size={14} className="shrink-0 text-gray-300" />
                <span className="truncate text-sm text-gray-700">{member.email}</span>
                <RoleBadge user={member} />
                <EmailBadge verified={member.emailVerified} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RoleBadge({ user }: { user: SuperUser }) {
  if (user.isSuperAdmin) {
    return (
      <span
        title="Administrador com acesso total à plataforma — gerencia lojas, planos e métricas"
        className="shrink-0 cursor-help rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-semibold text-white"
      >
        Plataforma
      </span>
    )
  }
  if (user.role === 'OWNER') {
    return (
      <span
        title="Dono da loja — pode editar perfil, convidar equipe e gerenciar plano"
        className="shrink-0 cursor-help rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700"
      >
        Proprietário
      </span>
    )
  }
  return (
    <span
      title="Membro da equipe — acessa produtos, pedidos e cupons, mas não gerencia a loja"
      className="shrink-0 cursor-help rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500"
    >
      Equipe
    </span>
  )
}

function EmailBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span
      title="E-mail confirmado pelo usuário"
      className="shrink-0 cursor-help text-[10px] font-semibold text-green-600"
    >
      Verificado
    </span>
  ) : (
    <span
      title="E-mail ainda não verificado — após 7 dias, o acesso ao painel será bloqueado até a verificação"
      className="shrink-0 cursor-help text-[10px] font-semibold text-orange-500"
    >
      Pendente
    </span>
  )
}
