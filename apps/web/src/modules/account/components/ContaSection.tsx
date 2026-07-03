'use client'

// Seção "Dados e conta" do perfil da loja (LGPD) — visível apenas para o OWNER:
// exportar todos os dados (portabilidade) e excluir a loja definitivamente
import { Download, Trash2, X, AlertTriangle } from 'lucide-react'
import { useContaSection } from '../hooks/useContaSection'

export function ContaSection() {
  const {
    isOwner,
    exporting,
    exportError,
    handleExport,
    deleteModalOpen,
    deletePassword,
    setDeletePassword,
    deleting,
    deleteError,
    openDeleteModal,
    closeDeleteModal,
    handleConfirmDelete,
  } = useContaSection()

  // Apenas o proprietário pode exportar e excluir a loja
  if (!isOwner) return null

  return (
    <section className="mt-8">
      <h2 className="mb-1 text-base font-semibold text-gray-900">Dados e conta</h2>
      <p className="mb-4 text-sm text-gray-400">
        Seus direitos sobre os dados da loja, garantidos pela LGPD.
      </p>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        {/* Exportar dados */}
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Exportar meus dados</p>
            <p className="text-xs text-gray-400">
              Baixa um arquivo JSON com perfil, equipe, produtos, pedidos, clientes e cupons.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            <Download size={15} />
            {exporting ? 'Exportando...' : 'Exportar'}
          </button>
        </div>

        {exportError && (
          <p className="mx-5 mb-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{exportError}</p>
        )}

        {/* Excluir a loja */}
        <div className="flex items-center justify-between gap-4 border-t border-gray-50 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-red-600">Excluir a loja</p>
            <p className="text-xs text-gray-400">
              Apaga definitivamente a loja e todos os dados dela: produtos, pedidos, clientes,
              imagens e equipe. Sem volta.
            </p>
          </div>
          <button
            onClick={openDeleteModal}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={15} />
            Excluir
          </button>
        </div>
      </div>

      {/* Modal de confirmação — exige a senha atual */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form onSubmit={handleConfirmDelete} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-600" />
                <h2 className="text-base font-semibold text-gray-900">Excluir a loja</h2>
              </div>
              <button type="button" onClick={closeDeleteModal} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-500">
              Todos os dados serão apagados <strong>definitivamente</strong> e a assinatura será
              cancelada. Se quiser guardar uma cópia, exporte os dados antes. Para confirmar,
              digite sua senha:
            </p>

            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Sua senha"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            />

            {deleteError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{deleteError}</p>
            )}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={deleting || !deletePassword}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? 'Excluindo...' : 'Excluir tudo'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
