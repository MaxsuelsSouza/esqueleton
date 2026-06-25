'use client'

// Página da sacola de compras — mostra itens, cupom e total
// O botão "Enviar pedido" abre o WhatsApp com o resumo formatado
//
// Os itens da sacola ficam no servidor (Redis) com apenas IDs e quantidades —
// os dados completos dos produtos (nome, preço, imagem) são buscados aqui ao abrir a página.

import { useState } from 'react'
import { Trash2, Plus, Minus, ShoppingBag, Tag, X, ArrowLeft, User, Phone, CheckSquare, Square } from 'lucide-react'
import { useSacolaPage, itemKey, formatCurrency } from './page.hooks'

export default function SacolaPage() {
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const {
    router,
    slug,
    items,
    totalItems,
    isLoading,
    removeItem,
    updateQuantity,
    clear,
    selectedKeys,
    toggleSelect,
    toggleSelectAll,
    selectedItems,
    selectedSubtotal,
    promoItems,
    promoDiscount,
    selectedDiscount,
    specialPromos,
    selectedTotal,
    appliedCoupon,
    couponInput,
    setCouponInput,
    couponError,
    applyCoupon,
    removeCoupon,
    customer,
    identModalOpen,
    nameInput,
    setNameInput,
    phoneInput,
    setPhoneInput,
    identError,
    nameRef,
    openIdentModalForEdit,
    closeIdentModal,
    handleModalBackdropClick,
    handleSendWhatsApp,
    handleIdentConfirm,
  } = useSacolaPage()

  // Carregando
  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-screen-sm px-4 py-12">
          <div className="flex flex-col items-center gap-4 py-20 text-center text-gray-400">
            <div className="h-12 w-12 animate-pulse rounded-full bg-gray-200" />
            <p className="text-sm text-gray-400">Carregando sacola...</p>
          </div>
        </div>
      </main>
    )
  }

  // Sacola vazia
  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-screen-sm px-4 py-12">
          <div className="flex flex-col items-center gap-4 py-20 text-center text-gray-400">
            <ShoppingBag size={52} strokeWidth={1.2} />
            <p className="text-lg font-semibold text-gray-700">Sua sacola está vazia</p>
            <p className="text-sm">Adicione produtos do catálogo para continuar.</p>
            <button
              onClick={() => router.push(`/loja/${slug}`)}
              className="mt-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
            >
              Ver catálogo
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-screen-sm px-4 py-6 sm:py-8">

        {/* Cabeçalho */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Voltar"
            className="rounded-xl p-2 text-gray-500 hover:bg-gray-200"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sacola</h1>
            <p className="text-sm text-gray-500">
              {selectedKeys.size} de {totalItems} {totalItems === 1 ? 'item' : 'itens'} selecionado{selectedKeys.size !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="text-xs text-gray-500 hover:text-gray-900"
            >
              {selectedKeys.size === items.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Lista de itens */}
        <div className="mb-4 flex flex-col gap-3">
          {items.map((item) => {
            const { product, quantity, promotionName, badgeColor, selectedOptions, effectivePrice, originalPrice, discountPercent } = item
            const key = itemKey(item)
            const isSelected = selectedKeys.has(key)
            const showBorder = !!(promotionName && badgeColor)
            // Texto com as opções selecionadas (ex: "Titânio Preto · 1TB")
            const optionsLabel = selectedOptions ? Object.values(selectedOptions).join(' · ') : ''
            return (
            <div
              key={key}
              className={`relative flex gap-3 rounded-2xl bg-white p-3 shadow-sm transition-opacity ${
                !isSelected ? 'opacity-50' : ''
              }`}
              style={showBorder
                ? { border: `2px solid ${badgeColor}` }
                : { border: '1px solid rgb(243 244 246)' }
              }
            >
              {/* Badge da promoção no canto superior direito */}
              {showBorder && (
                <span
                  className="absolute -top-2.5 right-3 z-10 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: badgeColor }}
                >
                  {promotionName}
                </span>
              )}

              <button
                onClick={() => toggleSelect(key)}
                aria-label={isSelected ? 'Desmarcar item' : 'Selecionar item'}
                className="shrink-0 self-center text-gray-400 hover:text-gray-700"
              >
                {isSelected
                  ? <CheckSquare size={20} className="text-gray-900" />
                  : <Square size={20} />
                }
              </button>

              <button
                onClick={() => router.push(`/loja/${slug}/produto/${product.id}`)}
                className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100"
              >
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300">
                    <ShoppingBag size={24} strokeWidth={1.5} />
                  </div>
                )}
              </button>

              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {product.brand && (
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                        {product.brand}
                      </p>
                    )}
                    <button
                      onClick={() => router.push(`/loja/${slug}/produto/${product.id}`)}
                      className="truncate text-sm font-semibold text-gray-900 text-left hover:underline"
                    >
                      {product.name}
                    </button>
                    {optionsLabel && (
                      <p className="text-xs text-gray-500">{optionsLabel}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(product.id, selectedOptions)}
                    aria-label="Remover item"
                    className="shrink-0 rounded-lg p-1 text-gray-300 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900">
                    {formatCurrency(effectivePrice * quantity)}
                    {quantity > 1 && (
                      <span className="ml-1.5 text-xs font-normal text-gray-400">
                        ({formatCurrency(effectivePrice)} cada)
                      </span>
                    )}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(product.id, quantity - 1, selectedOptions)}
                      disabled={quantity <= 1}
                      aria-label="Diminuir quantidade"
                      className={`flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 ${
                        quantity <= 1
                          ? 'cursor-not-allowed text-gray-300'
                          : 'text-gray-500 hover:border-gray-400 hover:text-gray-900'
                      }`}
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold text-gray-900">
                      {quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(product.id, quantity + 1, selectedOptions)}
                      aria-label="Aumentar quantidade"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-900"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )})}
        </div>

        {/* Cupom de desconto */}
        <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-700">Cupom de desconto</p>

          {appliedCoupon ? (
            <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5">
              <Tag size={15} className="shrink-0 text-green-600" />
              <div className="flex-1 min-w-0">
                <span className="font-mono text-sm font-semibold text-green-700">{appliedCoupon.code}</span>
                {appliedCoupon.description && (
                  <span className="ml-2 text-xs text-green-600">{appliedCoupon.description}</span>
                )}
              </div>
              <button
                onClick={removeCoupon}
                className="shrink-0 text-green-500 hover:text-green-700"
                aria-label="Remover cupom"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); }}
                  onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                  placeholder="Código do cupom"
                  className="h-10 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-mono placeholder-gray-400 focus:border-gray-400 focus:outline-none"
                />
                <button
                  onClick={applyCoupon}
                  disabled={!couponInput.trim()}
                  className="h-10 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-40"
                >
                  Aplicar
                </button>
              </div>
              {couponError && <p className="text-xs text-red-500">{couponError}</p>}
            </div>
          )}
        </div>

        {/* Incentivos de promoções especiais — quase ativando */}
        {specialPromos.messages.filter((m) => m.type === 'incentive').length > 0 && (
          <div className="mb-4 flex flex-col gap-2">
            {specialPromos.messages.filter((m) => m.type === 'incentive').map((msg, i) => (
              <div
                key={`incentive-${i}`}
                className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700"
              >
                <span className="shrink-0 text-base">💡</span>
                <span>
                  <span className="font-semibold">{msg.promoName}:</span> {msg.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Resumo de valores */}
        <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal ({selectedKeys.size} {selectedKeys.size === 1 ? 'item' : 'itens'})</span>
              <span>{formatCurrency(selectedSubtotal)}</span>
            </div>

            {promoDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Promoções ({promoItems.length} {promoItems.length === 1 ? 'item' : 'itens'})</span>
                <span>-{formatCurrency(promoDiscount)}</span>
              </div>
            )}

            {/* Descontos especiais: buy_x_get_y e kit ativados */}
            {specialPromos.messages.filter((m) => m.type === 'active').map((msg, i) => (
              <div key={`active-${i}`} className="text-sm text-green-600">
                {msg.text}
              </div>
            ))}

            {selectedDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Cupom ({appliedCoupon?.code})</span>
                <span>-{formatCurrency(selectedDiscount)}</span>
              </div>
            )}

            <div className="mt-1 flex justify-between border-t pt-2 text-base font-bold text-gray-900">
              <span>Total</span>
              <span>{formatCurrency(selectedTotal)}</span>
            </div>
          </div>
        </div>

        {/* Identificação do cliente */}
        {customer && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <User size={15} className="shrink-0 text-gray-400" />
            <p className="flex-1 text-sm text-gray-700">
              Pedido como <span className="font-semibold text-gray-900">{customer.name}</span>
            </p>
            <button
              onClick={openIdentModalForEdit}
              className="text-xs text-gray-400 hover:text-gray-700"
            >
              Alterar
            </button>
          </div>
        )}

        {/* Botão enviar pedido pelo WhatsApp */}
        <button
          onClick={handleSendWhatsApp}
          disabled={selectedKeys.size === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-green-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Enviar pedido pelo WhatsApp
        </button>

      </div>

      {/* Modal de confirmação de limpeza da sacola */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowClearConfirm(false)}
        >
          <div className="mx-4 w-full max-w-xs overflow-hidden rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-5 text-center">
              <p className="text-sm font-semibold text-gray-900">Deseja remover todos os itens da sacola?</p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { clear(); setShowClearConfirm(false) }}
                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de identificação do cliente */}
      {identModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={handleModalBackdropClick}
        >
          <div className="w-full max-w-sm overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">

            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Identificação</h2>
                <p className="text-xs text-gray-500">Seus dados serão enviados junto com o pedido</p>
              </div>
              <button onClick={closeIdentModal} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4 px-5 py-5">

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <User size={14} className="text-gray-400" />
                  Nome
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleIdentConfirm()}
                  placeholder="Seu nome completo"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-900"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Phone size={14} className="text-gray-400" />
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleIdentConfirm()}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-900"
                />
              </div>

              {identError && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{identError}</p>
              )}

              <button
                onClick={handleIdentConfirm}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3 text-sm font-bold text-white hover:bg-green-600 active:scale-[0.98]"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Confirmar e enviar pelo WhatsApp
              </button>

            </div>
          </div>
        </div>
      )}

    </main>
  )
}
