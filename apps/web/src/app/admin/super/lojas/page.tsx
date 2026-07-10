'use client'

// Gestão de lojas da plataforma (super-admin) — busca, filtro por status,
// suspender/reativar, trocar o plano, criar loja (venda presencial) e
// gerar link de pagamento para o cliente cadastrar o cartão
import { useState } from 'react'
import { Search, Building2, Ban, CheckCircle2, Layers, Plus, Link2, Copy, Check, X, HandCoins } from 'lucide-react'
import type { SuperPlan, SuperStoreCreateInput } from '@esqueleton/shared'
import { useSuperLojasPage } from './page.hooks'

// Formata centavos como "R$ 49,90" para exibir nos seletores de plano
function formatarPreco(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Caixa que exibe o link de pagamento com botões de copiar e enviar por WhatsApp
function PaymentLinkBox({ link }: { link: string | null }) {
  const [copied, setCopied] = useState(false)

  if (!link) {
    return (
      <p className="rounded-lg bg-yellow-50 px-3.5 py-2.5 text-sm text-yellow-700">
        A assinatura ficou aguardando pagamento, mas o link não pôde ser gerado
        (verifique a configuração do MercadoPago). Você pode gerar um novo link
        pela lista de lojas.
      </p>
    )
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link!)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sem permissão de clipboard — o campo abaixo permite copiar manualmente
    }
  }

  const mensagemWhatsApp = encodeURIComponent(
    `Olá! Aqui está o link para ativar a assinatura da sua loja: ${link}`
  )

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">
        Envie este link para o cliente — ao cadastrar o cartão, a assinatura é ativada automaticamente:
      </p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 outline-none"
        />
        <button
          type="button"
          onClick={handleCopy}
          title="Copiar link"
          className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50"
        >
          {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
        </button>
      </div>
      <a
        href={`https://wa.me/?text=${mensagemWhatsApp}`}
        target="_blank"
        rel="noreferrer"
        className="inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
      >
        Enviar pelo WhatsApp
      </a>
    </div>
  )
}

// Seletor de plano usado nos dois modais
function PlanSelect({
  plans,
  value,
  onChange,
  disabled,
}: {
  plans: SuperPlan[]
  value: string
  onChange: (planId: string) => void
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-900 disabled:opacity-50"
    >
      <option value="">Escolha o plano</option>
      {plans.map((plan) => (
        <option key={plan.id} value={plan.id}>
          {plan.name} — {plan.priceInCents === 0 ? 'gratuito' : `${formatarPreco(plan.priceInCents)}/${plan.billingPeriod === 'YEARLY' ? 'ano' : 'mês'}`}
        </option>
      ))}
    </select>
  )
}

export default function SuperLojasPage() {
  const {
    stores,
    plans,
    total,
    page,
    setPage,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    loading,
    error,
    busyId,
    isChecking,
    totalPages,
    handleToggleStatus,
    handleChangePlan,
    showCreateModal,
    openCreateModal,
    closeCreateModal,
    createForm,
    updateCreateField,
    handleCreateStore,
    createResult,
    isCreating,
    createError,
    paidPlans,
    linkStore,
    openLinkModal,
    closeLinkModal,
    linkPlanId,
    setLinkPlanId,
    handleGeneratePaymentLink,
    linkResult,
    isGeneratingLink,
    linkError,
    setupFeeStore,
    openSetupFeeModal,
    closeSetupFeeModal,
    handleConfirmSetupFee,
    setupFeeResult,
    isConfirmingSetupFee,
    setupFeeError,
  } = useSuperLojasPage()

  if (isChecking || loading) {
    return <div className="flex min-h-[50vh] items-center justify-center" />
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Lojas da plataforma</h1>
          <p className="text-sm text-gray-400">{total} loja{total === 1 ? '' : 's'} cadastrada{total === 1 ? '' : 's'}.</p>
        </div>
        {/* Venda presencial: o vendedor cadastra a loja do cliente na hora */}
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          <Plus size={15} /> Nova loja
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{error}</p>
      )}

      {/* Busca e filtro por status */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por nome ou endereço da loja"
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-gray-300 focus:border-gray-900"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-900"
        >
          <option value="">Todas</option>
          <option value="ACTIVE">Ativas</option>
          <option value="SUSPENDED">Suspensas</option>
        </select>
      </div>

      {/* Tabela de lojas */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
        {stores.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
            <Building2 size={32} />
            <p className="text-sm">Nenhuma loja encontrada.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3">Loja</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Usuários</th>
                <th className="px-4 py-3">Produtos</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stores.map((store) => (
                <tr key={store.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{store.name}</p>
                    <a
                      href={`/loja/${store.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-gray-400 hover:text-gray-700 hover:underline"
                    >
                      /loja/{store.slug}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {store.status === 'ACTIVE' ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Ativa</span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">Suspensa</span>
                    )}
                    {store.subscriptionStatus === 'PENDING_SETUP' && (
                      <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Aguardando implantação
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {/* Seletor de plano — trocar aqui cancela a cobrança atual */}
                    <select
                      value={store.plan?.id ?? ''}
                      onChange={(e) => handleChangePlan(store, e.target.value)}
                      disabled={busyId === store.id}
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-gray-900 disabled:opacity-50"
                    >
                      {!store.plan && <option value="">Sem plano</option>}
                      {plans.filter((p) => p.active || p.id === store.plan?.id).map((plan) => (
                        <option key={plan.id} value={plan.id}>{plan.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{store.usersCount}</td>
                  <td className="px-4 py-3 text-gray-600">{store.productsCount}</td>
                  <td className="px-4 py-3 text-right">
                    {/* Venda presencial aguardando a confirmação manual da taxa de implantação */}
                    {store.subscriptionStatus === 'PENDING_SETUP' && (
                      <button
                        onClick={() => openSetupFeeModal(store)}
                        title="Confirmar implantação recebida"
                        className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-amber-50 hover:text-amber-600"
                      >
                        <HandCoins size={16} />
                      </button>
                    )}
                    {/* Link de pagamento — só faz sentido quando a loja ainda não tem assinatura ativa */}
                    {store.subscriptionStatus !== 'ACTIVE' && store.subscriptionStatus !== 'PENDING_SETUP' && (
                      <button
                        onClick={() => openLinkModal(store)}
                        disabled={busyId === store.id}
                        title="Gerar link de pagamento"
                        className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                      >
                        <Link2 size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleStatus(store)}
                      disabled={busyId === store.id}
                      title={store.status === 'ACTIVE' ? 'Suspender loja' : 'Reativar loja'}
                      className={`rounded-lg p-2 transition-colors disabled:opacity-50 ${
                        store.status === 'ACTIVE'
                          ? 'text-gray-300 hover:bg-red-50 hover:text-red-500'
                          : 'text-gray-300 hover:bg-green-50 hover:text-green-600'
                      }`}
                    >
                      {store.status === 'ACTIVE' ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                    </button>
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

      {/* Atalho para gestão de planos */}
      <p className="mt-6 flex items-center gap-1.5 text-xs text-gray-400">
        <Layers size={13} /> Os planos disponíveis são gerenciados em Plataforma → Planos.
      </p>

      {/* Modal: criar loja (venda presencial) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeCreateModal}>
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                {createResult ? 'Loja criada' : 'Nova loja (venda presencial)'}
              </h2>
              <button onClick={closeCreateModal} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            {createResult ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-green-50 px-3.5 py-2.5 text-sm text-green-700">
                  A loja <strong>{createResult.store.name}</strong> foi criada e o acesso de{' '}
                  <strong>{createResult.owner.email}</strong> está pronto. O dono deverá trocar a
                  senha temporária no primeiro login.
                </div>
                {createResult.subscription.status === 'ACTIVE' ? (
                  <p className="text-sm text-gray-600">
                    O plano escolhido é gratuito — a assinatura já está ativa, sem pagamento.
                  </p>
                ) : createResult.subscription.status === 'PENDING_SETUP' ? (
                  <p className="text-sm text-gray-600">
                    Este é um plano presencial: a loja fica fora do ar até você confirmar o
                    recebimento da taxa de implantação na lista de lojas (ícone de "Confirmar
                    implantação"). A mensalidade só começa a ser cobrada 30 dias depois disso.
                  </p>
                ) : (
                  <PaymentLinkBox link={createResult.paymentLink} />
                )}
                <button
                  onClick={closeCreateModal}
                  className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateStore} className="space-y-3">
                {createError && (
                  <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{createError}</p>
                )}

                {([
                  { field: 'storeName', label: 'Nome da loja', type: 'text', placeholder: 'Perfumaria da Ana' },
                  { field: 'storeSlug', label: 'Endereço (slug)', type: 'text', placeholder: 'perfumaria-da-ana' },
                  { field: 'whatsapp', label: 'WhatsApp da loja', type: 'tel', placeholder: '(81) 99999-8888' },
                  { field: 'email', label: 'E-mail do dono', type: 'email', placeholder: 'dono@email.com' },
                  { field: 'password', label: 'Senha temporária', type: 'text', placeholder: 'Mínimo 8 caracteres' },
                ] as Array<{ field: keyof SuperStoreCreateInput; label: string; type: string; placeholder: string }>).map(({ field, label, type, placeholder }) => (
                  <div key={field}>
                    <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
                    <input
                      type={type}
                      required
                      value={createForm[field]}
                      onChange={(e) => updateCreateField(field, e.target.value)}
                      placeholder={placeholder}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition placeholder:text-gray-300 focus:border-gray-900"
                    />
                  </div>
                ))}

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Plano</label>
                  <PlanSelect
                    plans={plans.filter((p) => p.active)}
                    value={createForm.planId}
                    onChange={(planId) => updateCreateField('planId', planId)}
                    disabled={isCreating}
                  />
                </div>

                <p className="text-xs text-gray-400">
                  Plano pago: a loja é criada e você recebe um link de pagamento para enviar ao
                  cliente — a assinatura ativa quando ele cadastrar o cartão.
                </p>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
                >
                  {isCreating ? 'Criando...' : 'Criar loja'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: gerar link de pagamento para loja existente */}
      {linkStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeLinkModal}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Link de pagamento</h2>
              <button onClick={closeLinkModal} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            {linkResult ? (
              <div className="space-y-4">
                <PaymentLinkBox link={linkResult.paymentLink} />
                <button
                  onClick={closeLinkModal}
                  className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Gerar cobrança para a loja <strong>{linkStore.name}</strong>. O link substitui
                  qualquer cobrança pendente anterior.
                </p>

                {linkError && (
                  <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{linkError}</p>
                )}

                <PlanSelect
                  plans={paidPlans}
                  value={linkPlanId}
                  onChange={setLinkPlanId}
                  disabled={isGeneratingLink}
                />

                <button
                  onClick={handleGeneratePaymentLink}
                  disabled={isGeneratingLink}
                  className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
                >
                  {isGeneratingLink ? 'Gerando...' : 'Gerar link de pagamento'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: confirmar a implantação (venda presencial) */}
      {setupFeeStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeSetupFeeModal}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Confirmar implantação</h2>
              <button onClick={closeSetupFeeModal} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            {setupFeeResult ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-green-50 px-3.5 py-2.5 text-sm text-green-700">
                  Implantação confirmada — a loja <strong>{setupFeeStore.name}</strong> já está no ar.
                  A cobrança mensal começa a valer em 30 dias.
                </div>
                <PaymentLinkBox link={setupFeeResult.paymentLink} />
                <button
                  onClick={closeSetupFeeModal}
                  className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Confirme apenas depois de receber a taxa de implantação da loja{' '}
                  <strong>{setupFeeStore.name}</strong>. A loja entra no ar imediatamente e a
                  mensalidade passa a ser cobrada automaticamente a partir do 30º dia.
                </p>

                {setupFeeError && (
                  <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{setupFeeError}</p>
                )}

                <button
                  onClick={handleConfirmSetupFee}
                  disabled={isConfirmingSetupFee}
                  className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
                >
                  {isConfirmingSetupFee ? 'Confirmando...' : 'Confirmar implantação recebida'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
