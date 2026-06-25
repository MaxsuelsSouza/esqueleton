'use client'

// Bottom sheet para selecionar variantes do produto antes de adicionar à sacola.
// Exibe foto, nome, preço e opções de variante — sobe até metade da tela no mobile.
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ShoppingBag, ImageOff } from 'lucide-react'
import type { Product } from '@esqueleton/shared'
import { ProductPrice } from './ProductPrice'
import { getOptionGroups, findVariant } from '../utils/variants'

interface VariantPickerModalProps {
  product: Product
  // Preço original antes da promoção — para exibir riscado
  originalPrice?: number
  // Percentual de desconto da promoção
  discountPercent?: number
  onAdd: (selectedOptions: Record<string, string>, variantId: string) => void
  onClose: () => void
}

export function VariantPickerModal({
  product,
  originalPrice,
  discountPercent,
  onAdd,
  onClose,
}: VariantPickerModalProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const activeVariants = (product.variants ?? []).filter((v) => v.active)
  const optionGroups = getOptionGroups(activeVariants)
  const selectedVariant = findVariant(activeVariants, selectedOptions)

  // Calcula o preço da variante selecionada (com desconto proporcional se houver promoção)
  const hasPromo = originalPrice !== undefined && originalPrice > product.price
  let displayPrice = product.price
  let displayOriginalPrice = originalPrice
  if (selectedVariant) {
    if (hasPromo && originalPrice !== undefined) {
      const discountRate = product.price / originalPrice
      displayPrice = Math.round(selectedVariant.price * discountRate * 100) / 100
      displayOriginalPrice = selectedVariant.price
    } else {
      displayPrice = selectedVariant.price
      displayOriginalPrice = undefined
    }
  }

  // Imagem: usa a da variante selecionada (se existir), senão a do produto
  const imageUrl = selectedVariant?.imageUrl ?? product.imageUrl

  // Animação de entrada — aguarda o mount para aplicar a classe de transição
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
  }, [])

  // Fecha com animação de saída
  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }, [onClose])

  // Fecha ao pressionar Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handleClose])

  // Bloqueia o scroll do body enquanto o modal está aberto
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleSelectOption(name: string, value: string) {
    setError(null)
    setSelectedOptions((prev) => {
      const next = { ...prev }
      // Se já está selecionado, desseleciona
      if (next[name] === value) {
        delete next[name]
      } else {
        next[name] = value
      }
      return next
    })
  }

  function handleAdd() {
    // Verifica se todas as opções foram selecionadas
    const missing = optionGroups.filter((g) => !selectedOptions[g.name])
    if (missing.length > 0) {
      setError(`Selecione: ${missing.map((g) => g.name).join(', ')}`)
      return
    }
    if (!selectedVariant) {
      setError('Combinação indisponível. Tente outra opção.')
      return
    }
    onAdd(selectedOptions, selectedVariant.id)
  }

  // Renderiza via portal no body para escapar de containers com transform/overflow
  // que quebram o position: fixed (ex: carrossel da seção em destaque)
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      {/* Backdrop escuro */}
      <div
        onClick={handleClose}
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          isVisible ? 'opacity-50' : 'opacity-0'
        }`}
      />

      {/* Mobile: bottom sheet (metade da tela) | Desktop: modal centralizado */}
      <div
        className={`relative w-full max-w-lg bg-white shadow-xl transition-all duration-300 ease-out
          rounded-t-2xl md:rounded-2xl
          ${isVisible
            ? 'translate-y-0 md:scale-100 md:opacity-100'
            : 'translate-y-full md:translate-y-0 md:scale-95 md:opacity-0'
          }`}
        style={{ maxHeight: '55vh' }}
      >
        {/* Barra de arrasto (visível só no mobile) + botão fechar */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="mx-auto h-1 w-10 rounded-full bg-gray-300 md:hidden" />
          <button
            onClick={handleClose}
            aria-label="Fechar"
            className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="overflow-y-auto px-4 pb-4" style={{ maxHeight: 'calc(55vh - 48px)' }}>
          {/* Produto: imagem + info */}
          <div className="flex gap-3 pb-4">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-50">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-300">
                  <ImageOff size={24} strokeWidth={1} />
                  <span className="text-[10px] text-gray-400">Sem imagem</span>
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-col justify-center gap-1">
              {product.brand && (
                <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">
                  {product.brand}
                </p>
              )}
              <h3 className="text-sm font-semibold leading-snug text-gray-900">
                {product.name}
              </h3>
              <ProductPrice
                price={displayPrice}
                size="sm"
                originalPrice={displayOriginalPrice}
                discountPercent={hasPromo ? discountPercent : undefined}
              />
            </div>
          </div>

          {/* Separador */}
          <div className="mb-4 h-px bg-gray-100" />

          {/* Seletores de variante */}
          <div className="flex flex-col gap-4">
            {optionGroups.map(({ name, values }) => (
              <div key={name}>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  {name}{selectedOptions[name] ? `: ${selectedOptions[name]}` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {values.map((value) => {
                    const isSelected = selectedOptions[name] === value
                    // Verifica se existe alguma variante ativa com esse valor
                    // combinado com as demais opções já selecionadas
                    const testOptions = { ...selectedOptions, [name]: value }
                    const isAvailable = activeVariants.some((v) =>
                      Object.entries(testOptions).every(([k, val]) => v.options[k] === val),
                    )
                    return (
                      <button
                        key={value}
                        onClick={() => isAvailable && handleSelectOption(name, value)}
                        disabled={!isAvailable}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                          isSelected
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : !isAvailable
                              ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300 line-through'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        {value}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Erro de validação */}
          {error && (
            <p className="mt-3 text-sm text-red-500">{error}</p>
          )}

          {/* Botão adicionar */}
          <button
            onClick={handleAdd}
            style={{ backgroundColor: 'var(--color-primary, #000000)' }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all active:scale-[0.98]"
          >
            <ShoppingBag size={16} />
            Adicionar à sacola
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
