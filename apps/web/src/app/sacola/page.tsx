'use client'

// Página da sacola de compras — mostra itens, cupom e total
// O botão "Enviar pedido" abre o WhatsApp com o resumo formatado
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus, Minus, ShoppingBag, Tag, X, ArrowLeft, User, Phone } from 'lucide-react'
import { useBag } from '@/contexts/bag-context'
import { useCustomer } from '@/contexts/customer-context'
import { useStoreProfile } from '@/contexts/store-profile-context'
import { analyticsService } from '@/services/analytics.service'
import { customersService } from '@/services/customers.service'
import { ordersService } from '@/services/orders.service'

export default function SacolaPage() {
  const router = useRouter()
  const {
    items, totalItems, removeItem, updateQuantity, clear,
    appliedCoupon, couponInput, setCouponInput, couponError, applyCoupon, removeCoupon,
    subtotal, discount, total,
  } = useBag()
  const { customer, setCustomer } = useCustomer()
  const { profile } = useStoreProfile()

  // Controle do modal de identificação do cliente
  const [identModalOpen, setIdentModalOpen] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [identError, setIdentError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  function formatCurrency(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Monta a mensagem formatada do pedido para enviar pelo WhatsApp
  function buildWhatsAppMessage(customerInfo: { name: string; phone: string }, orderNumber: string) {
    const now = new Date()
    const date = now.toLocaleDateString('pt-BR')
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const divider = '━━━━━━━━━━━━━━━━━━━━'

    const lines: string[] = []

    // Cabeçalho do pedido
    lines.push(`🛍️ *NOVO PEDIDO #${orderNumber}*`)
    lines.push(`📅 ${date} às ${time}`)

    // Dados do cliente
    if (customerInfo) {
      lines.push('')
      lines.push(`👤 *CLIENTE*`)
      lines.push(`Nome: *${customerInfo.name}*`)
      lines.push(`Telefone: ${customerInfo.phone}`)
    }

    // Itens
    lines.push('')
    lines.push(divider)
    lines.push(`📦 *PRODUTOS*`)
    lines.push(divider)

    items.forEach(({ product, quantity, promotionName }, index) => {
      const name = product.brand ? `${product.brand} ${product.name}` : product.name
      const unitPrice = product.price
      const lineTotal = unitPrice * quantity

      lines.push('')
      lines.push(`*${index + 1}. ${name}*`)
      lines.push(`   🔢 ${quantity} ${quantity === 1 ? 'unidade' : 'unidades'} × ${formatCurrency(unitPrice)}`)

      // Mostra preço original quando há desconto de promoção
      if (product.originalPrice && product.originalPrice > product.price) {
        lines.push(`   De: ~R$ ${product.originalPrice.toFixed(2).replace('.', ',')}~ → Por: ${formatCurrency(unitPrice)}`)
      }

      // Nome da promoção ativa
      if (promotionName) {
        lines.push(`   🏷️ Promoção: *${promotionName}*`)
      }

      lines.push(`   💵 Subtotal: *${formatCurrency(lineTotal)}*`)
    })

    // Resumo financeiro
    lines.push('')
    lines.push(divider)
    lines.push(`💰 *RESUMO*`)
    lines.push(divider)
    lines.push('')

    if (appliedCoupon) {
      lines.push(`Subtotal: ${formatCurrency(subtotal)}`)
      lines.push(`🎟️ Cupom *${appliedCoupon.code}*: -${formatCurrency(discount)}`)
      if (appliedCoupon.description) {
        lines.push(`   _${appliedCoupon.description}_`)
      }
      lines.push('')
    }

    lines.push(`💳 *TOTAL: ${formatCurrency(total)}*`)
    lines.push('')
    lines.push(divider)
    lines.push('Aguardando confirmação ✅')

    return lines.join('\n')
  }

  // Efetivamente abre o WhatsApp, salva o pedido e dispara analytics — tudo em paralelo
  function goToWhatsApp(customerInfo: { name: string; phone: string }) {
    // 1. Gera o número do pedido — o mesmo que vai na mensagem e no banco
    const orderNumber = String(Date.now()).slice(-6)

    // 2. Abre o WhatsApp imediatamente
    const message = encodeURIComponent(buildWhatsAppMessage(customerInfo, orderNumber))
    // Usa o número cadastrado no perfil da loja (admin → Perfil)
    const whatsappNumber = profile.whatsapp ?? ''
    const url = whatsappNumber
      ? `https://wa.me/${whatsappNumber}?text=${message}`
      : `https://wa.me/?text=${message}`
    window.open(url, '_blank')

    // 3. Salva o pedido no banco — fire and forget
    ordersService.create({
      orderNumber,
      customerName: customerInfo.name,
      customerPhone: customerInfo.phone,
      items: items.map(({ product, quantity, promotionName }) => ({
        productId: product.id,
        productName: product.brand ? `${product.brand} ${product.name}` : product.name,
        quantity,
        unitPrice: product.price,
        lineTotal: product.price * quantity,
        promotionName: promotionName ?? undefined,
        originalPrice: product.originalPrice ?? undefined,
      })),
      subtotal,
      discount,
      total,
      couponCode: appliedCoupon?.code ?? undefined,
    })

    // 4. Registra analytics — fire and forget
    for (const { product, promotionId, promotionName } of items) {
      analyticsService.recordEvent({
        productId: product.id,
        productName: product.brand ? `${product.brand} ${product.name}` : product.name,
        eventType: 'WHATSAPP_SEND',
        promotionId,
        promotionName,
        couponCode: appliedCoupon?.code,
      })
    }
  }

  // Clique no botão principal — se já identificado, vai direto; senão, abre o modal
  function handleSendWhatsApp() {
    if (customer) {
      goToWhatsApp(customer)
    } else {
      setNameInput('')
      setPhoneInput('')
      setIdentError(null)
      setIdentModalOpen(true)
      // Foca o campo nome assim que o modal abrir
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }

  // Confirmação do modal — salva cliente, abre WhatsApp imediatamente, salva no banco em paralelo
  function handleIdentConfirm() {
    const name = nameInput.trim()
    const phone = phoneInput.trim()

    if (!name) { setIdentError('Informe seu nome.'); return }
    if (phone.length < 8) { setIdentError('Informe um telefone válido.'); return }

    const info = { name, phone }

    // 1. Salva no contexto / localStorage
    setCustomer(info)

    // 2. Fecha o modal e abre o WhatsApp imediatamente
    setIdentModalOpen(false)
    goToWhatsApp(info)

    // 3. Salva no banco em paralelo — fire and forget
    customersService.upsert(name, phone)
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
              onClick={() => router.push('/')}
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
              {totalItems} {totalItems === 1 ? 'item' : 'itens'}
            </p>
          </div>
          {/* Limpar sacola */}
          <button
            onClick={clear}
            className="ml-auto text-xs text-gray-400 hover:text-red-500"
          >
            Limpar
          </button>
        </div>

        {/* Lista de itens */}
        <div className="mb-4 flex flex-col gap-3">
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">

              {/* Foto */}
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300">
                    <ShoppingBag size={24} strokeWidth={1.5} />
                  </div>
                )}
              </div>

              {/* Informações */}
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {product.brand && (
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                        {product.brand}
                      </p>
                    )}
                    <p className="truncate text-sm font-semibold text-gray-900">{product.name}</p>
                    {/* Aviso de estoque baixo na sacola */}
                    {product.stock != null && product.stock < 6 && (
                      <p className={`text-xs font-semibold ${product.stock === 0 ? 'text-red-500' : 'text-orange-500'}`}>
                        {product.stock === 0
                          ? 'Esgotado'
                          : `Restam ${product.stock} ${product.stock === 1 ? 'unidade' : 'unidades'}`}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(product.id)}
                    aria-label="Remover item"
                    className="shrink-0 rounded-lg p-1 text-gray-300 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  {/* Preço da linha */}
                  <p className="text-sm font-bold text-gray-900">
                    {formatCurrency(product.price * quantity)}
                    {quantity > 1 && (
                      <span className="ml-1.5 text-xs font-normal text-gray-400">
                        ({formatCurrency(product.price)} cada)
                      </span>
                    )}
                  </p>

                  {/* Controle de quantidade */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                      aria-label="Diminuir quantidade"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-900"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold text-gray-900">
                      {quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(product.id, quantity + 1)}
                      aria-label="Aumentar quantidade"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-900"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cupom de desconto */}
        <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-700">Cupom de desconto</p>

          {appliedCoupon ? (
            // Cupom aplicado — exibe resumo com botão de remover
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

        {/* Resumo de valores */}
        <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto {appliedCoupon ? `(${appliedCoupon.code})` : ''}</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}

            <div className="mt-1 flex justify-between border-t pt-2 text-base font-bold text-gray-900">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Identificação do cliente — exibe quando já está identificado */}
        {customer && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <User size={15} className="shrink-0 text-gray-400" />
            <p className="flex-1 text-sm text-gray-700">
              Pedido como <span className="font-semibold text-gray-900">{customer.name}</span>
            </p>
            <button
              onClick={() => { setIdentModalOpen(true); setNameInput(customer.name); setPhoneInput(customer.phone); setIdentError(null) }}
              className="text-xs text-gray-400 hover:text-gray-700"
            >
              Alterar
            </button>
          </div>
        )}

        {/* Botão enviar pedido pelo WhatsApp */}
        <button
          onClick={handleSendWhatsApp}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-green-600 active:scale-[0.98]"
        >
          {/* Ícone do WhatsApp em SVG */}
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Enviar pedido pelo WhatsApp
        </button>

      </div>

      {/* Modal de identificação do cliente */}
      {identModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) setIdentModalOpen(false) }}
        >
          <div className="w-full max-w-sm overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">

            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Identificação</h2>
                <p className="text-xs text-gray-500">Para o lojista entrar em contato com você</p>
              </div>
              <button onClick={() => setIdentModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            {/* Formulário */}
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
