'use client'

// Página de clientes — lista os clientes identificados nos pedidos e oferece
// as ferramentas do art. 18 da LGPD: corrigir, exportar e excluir cadastros
import { Search, Pencil, Trash2, Download, UsersRound, X } from 'lucide-react'
import { useClientesPage } from './page.hooks'

// Formata "5511999999999" como "+55 (11) 99999-9999" para leitura
function formatPhone(phone: string): string {
  const match = phone.match(/^55(\d{2})(\d{4,5})(\d{4})$/)
  if (!match) return phone
  return `+55 (${match[1]}) ${match[2]}-${match[3]}`
}

export default function ClientesPage() {
  const {
    customers,
    totalCustomers,
    loading,
    error,
    isChecking,
    search,
    setSearch,
    editingCustomer,
    editName,
    setEditName,
    editPhone,
    setEditPhone,
    saving,
    editError,
    openEdit,
    closeEdit,
    handleSaveEdit,
    deletingCustomer,
    anonimizarPedidos,
    setAnonimizarPedidos,
    deleting,
    openDelete,
    closeDelete,
    handleConfirmDelete,
    exportingId,
    handleExport,
  } = useClientesPage()

  if (isChecking || loading) {
    return <div className="flex min-h-[50vh] items-center justify-center" />
  }

  const inputClass =
    'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10'

  return (
    <div className="mx-auto max-w-2xl">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Clientes</h1>
        <p className="text-sm text-gray-400">
          Clientes identificados nos pedidos. Aqui você corrige, exporta e exclui cadastros —
          suas obrigações com a LGPD.
        </p>
      </div>

      {/* Busca por nome ou telefone */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone"
          className={`${inputClass} pl-10`}
        />
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{error}</p>
      )}

      {/* Lista de clientes */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        {customers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
            <UsersRound size={32} />
            <p className="text-sm">
              {totalCustomers === 0 ? 'Nenhum cliente identificado ainda.' : 'Nenhum cliente encontrado na busca.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {customers.map((customer) => (
              <li key={customer.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                  <p className="text-xs text-gray-400">{formatPhone(customer.phone)}</p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleExport(customer)}
                    disabled={exportingId === customer.id}
                    className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50"
                    title="Exportar dados (portabilidade)"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => openEdit(customer)}
                    className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-gray-50 hover:text-gray-700"
                    title="Corrigir cadastro"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => openDelete(customer)}
                    className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Excluir cadastro"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal de correção do cadastro */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form onSubmit={handleSaveEdit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Corrigir cadastro</h2>
              <button type="button" onClick={closeEdit} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do cliente"
                required
                minLength={2}
                maxLength={120}
                className={inputClass}
              />
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Telefone"
                required
                className={inputClass}
              />
            </div>

            {editError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{editError}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="mt-4 w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-base font-semibold text-gray-900">Excluir cliente</h2>
            <p className="mb-4 text-sm text-gray-500">
              O cadastro de <strong>{deletingCustomer.name}</strong> será excluído
              definitivamente. Esta ação não pode ser desfeita.
            </p>

            {/* Opção de anonimizar os pedidos — remove nome/telefone mas mantém os valores */}
            <label className="mb-5 flex items-start gap-2.5 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={anonimizarPedidos}
                onChange={(e) => setAnonimizarPedidos(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-gray-900"
              />
              <span>
                Anonimizar também os pedidos deste cliente — o nome e o telefone são removidos
                dos pedidos, mas os valores permanecem nas suas estatísticas.
              </span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={closeDelete}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
