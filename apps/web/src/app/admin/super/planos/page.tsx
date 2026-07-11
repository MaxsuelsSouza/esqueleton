'use client'

// CRUD de planos da plataforma (super-admin) — nome, identificador, limites,
// preço e período. Planos pagos criam o Product + Price no Stripe via API.
import { Plus, Pencil, Trash2, Layers, X } from 'lucide-react'
import { useSuperPlanosPage, formatPrice } from './page.hooks'

export default function SuperPlanosPage() {
  const {
    plans,
    loading,
    error,
    isChecking,
    showForm,
    setShowForm,
    editingPlan,
    formData,
    setFormData,
    formError,
    saving,
    deletingId,
    openCreateForm,
    openEditForm,
    handleSave,
    handleDeactivate,
  } = useSuperPlanosPage()

  if (isChecking || loading) {
    return <div className="flex min-h-[50vh] items-center justify-center" />
  }

  const inputClass =
    'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10'

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Planos</h1>
          <p className="text-sm text-gray-400">Defina os planos, limites e preços do SaaS.</p>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700"
        >
          <Plus size={16} />
          Novo plano
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{error}</p>
      )}

      {/* Formulário de criação/edição */}
      {showForm && (
        <form onSubmit={handleSave} className="mb-6 rounded-2xl border border-gray-100 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {editingPlan ? `Editar plano "${editingPlan.name}"` : 'Novo plano'}
            </p>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-300 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-gray-500">
              Nome
              <input
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Profissional"
                required
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="text-xs font-medium text-gray-500">
              Identificador (slug)
              <input
                value={formData.slug}
                onChange={(e) => setFormData((f) => ({ ...f, slug: e.target.value }))}
                placeholder="Ex: profissional"
                required
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="text-xs font-medium text-gray-500">
              Preço (R$ por período — 0 = gratuito)
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.priceInReais}
                onChange={(e) => setFormData((f) => ({ ...f, priceInReais: e.target.value }))}
                placeholder="0,00"
                required
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="text-xs font-medium text-gray-500">
              Período de cobrança
              <select
                value={formData.billingPeriod}
                onChange={(e) => setFormData((f) => ({ ...f, billingPeriod: e.target.value as 'MONTHLY' | 'YEARLY' }))}
                className={`mt-1 ${inputClass}`}
              >
                <option value="MONTHLY">Mensal</option>
                <option value="YEARLY">Anual</option>
              </select>
            </label>
            <label className="text-xs font-medium text-gray-500">
              Limite de produtos (vazio = ilimitado)
              <input
                type="number" min="0" step="1"
                value={formData.maxProducts}
                onChange={(e) => setFormData((f) => ({ ...f, maxProducts: e.target.value }))}
                placeholder="Ilimitado"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="text-xs font-medium text-gray-500">
              Limite de usuários (vazio = ilimitado)
              <input
                type="number" min="1" step="1"
                value={formData.maxUsers}
                onChange={(e) => setFormData((f) => ({ ...f, maxUsers: e.target.value }))}
                placeholder="Ilimitado"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="text-xs font-medium text-gray-500">
              Limite de pedidos por mês (vazio = ilimitado)
              <input
                type="number" min="0" step="1"
                value={formData.maxOrdersPerMonth}
                onChange={(e) => setFormData((f) => ({ ...f, maxOrdersPerMonth: e.target.value }))}
                placeholder="Ilimitado"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="text-xs font-medium text-gray-500">
              Ordem de exibição (menor aparece primeiro)
              <input
                type="number" min="0" step="1"
                value={formData.sortOrder}
                onChange={(e) => setFormData((f) => ({ ...f, sortOrder: e.target.value }))}
                className={`mt-1 ${inputClass}`}
              />
            </label>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData((f) => ({ ...f, active: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300"
            />
            Plano ativo (visível para assinatura)
          </label>

          {formError && (
            <p className="mt-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{formError}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : editingPlan ? 'Salvar alterações' : 'Criar plano'}
          </button>
        </form>
      )}

      {/* Lista de planos */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        {plans.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
            <Layers size={32} />
            <p className="text-sm">Nenhum plano cadastrado.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {plans.map((plan) => (
              <li key={plan.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{plan.name}</p>
                    {!plan.active && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">Inativo</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {plan.priceInCents === 0 ? 'Gratuito' : `${formatPrice(plan.priceInCents)} / ${plan.billingPeriod === 'YEARLY' ? 'ano' : 'mês'}`}
                    {' · '}
                    {plan.activeSubscriptions} loja{plan.activeSubscriptions === 1 ? '' : 's'}
                    {' · '}
                    {plan.limits.maxProducts ?? '∞'} produtos, {plan.limits.maxUsers ?? '∞'} usuários, {plan.limits.maxOrdersPerMonth ?? '∞'} pedidos/mês
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => openEditForm(plan)}
                    title="Editar plano"
                    className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Pencil size={15} />
                  </button>
                  {plan.active && (
                    <button
                      onClick={() => handleDeactivate(plan)}
                      disabled={deletingId === plan.id}
                      title="Desativar plano"
                      className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
