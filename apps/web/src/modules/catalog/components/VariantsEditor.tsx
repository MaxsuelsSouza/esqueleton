'use client'

// Editor de variantes do produto.
//
// Modelo pensado como o lojista pensa: cada VARIAÇÃO PRINCIPAL (ex: uma Cor) é um
// card com sua FOTO e seu PREÇO. Opcionalmente o produto também varia por um
// SEGUNDO atributo (ex: Tamanho), e cada card escolhe seus próprios valores
// (Rosa: P, M, G / Verde: M, G). Todos os tamanhos de uma cor herdam o preço e a
// foto daquela cor.
//
// Por baixo, isso vira as combinações que a página do produto espera (Rosa+P,
// Rosa+M, ...) — ver getOptionGroups/findVariant em utils/variants.
import { useMemo, useState } from 'react'
import { X, Plus } from 'lucide-react'
import { ImageUploader } from './ImageUploader'

// Formato de cada variante pronto para o formulário do produto.
// Igual ao VariantFormData da página — mantido aqui para o módulo não depender do app.
export type ProductVariantInput = {
  id?: string
  options: Record<string, string>
  price: string
  imageUrl: string
  active: boolean
}

// ── Estruturas internas do editor ───────────────────────────────────────────

// Um valor do segundo atributo (ex: o tamanho "P"). variantId preserva a variante
// já salva para a API atualizar no lugar em vez de recriar.
type SecondaryValue = { id: string; label: string; variantId?: string }

// Um card da variação principal (ex: a cor "Rosa") com foto, preço e seus valores.
type PrimaryCard = {
  id: string
  label: string
  price: string
  imageUrl: string
  values: SecondaryValue[]
  // Usado quando o produto NÃO tem segundo atributo (o card vira uma variante direta)
  variantId?: string
}

type EditorState = {
  primaryName: string
  secondaryEnabled: boolean
  secondaryName: string
  cards: PrimaryCard[]
}

const inputStyle =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900'

const uid = () => Math.random().toString(36).slice(2, 10)

// ── Conversão estado ⇄ variantes ────────────────────────────────────────────

// Gera as variantes (combinações) a partir do estado do editor
function buildVariants(state: EditorState, basePrice: string): ProductVariantInput[] {
  const primary = state.primaryName.trim()
  if (primary === '') return []

  const secondaryOn = state.secondaryEnabled && state.secondaryName.trim() !== ''
  const secondary = state.secondaryName.trim()
  const out: ProductVariantInput[] = []

  for (const card of state.cards) {
    const label = card.label.trim()
    if (label === '') continue
    // Preço em branco herda o preço base do produto
    const price = card.price.trim() || basePrice || ''

    if (secondaryOn) {
      for (const value of card.values) {
        const valueLabel = value.label.trim()
        if (valueLabel === '') continue
        out.push({
          id: value.variantId,
          options: { [primary]: label, [secondary]: valueLabel },
          price,
          imageUrl: card.imageUrl,
          active: true,
        })
      }
    } else {
      out.push({
        id: card.variantId,
        options: { [primary]: label },
        price,
        imageUrl: card.imageUrl,
        active: true,
      })
    }
  }

  return out
}

// Reconstrói o estado do editor a partir de variantes já salvas (modo edição)
function deriveInitial(variants: ProductVariantInput[]): EditorState {
  if (variants.length === 0) {
    return { primaryName: 'Cor', secondaryEnabled: false, secondaryName: 'Tamanho', cards: [] }
  }

  // Descobre os nomes dos atributos pela ordem em que aparecem
  const keys: string[] = []
  for (const variant of variants) {
    for (const key of Object.keys(variant.options)) {
      if (!keys.includes(key)) keys.push(key)
    }
  }
  const primaryName = keys[0] ?? 'Cor'
  const secondaryName = keys[1] ?? 'Tamanho'
  const secondaryEnabled = keys.length >= 2

  const cardByLabel = new Map<string, PrimaryCard>()
  const cards: PrimaryCard[] = []

  for (const variant of variants) {
    const primaryLabel = variant.options[primaryName] ?? ''
    let card = cardByLabel.get(primaryLabel)
    if (!card) {
      card = { id: uid(), label: primaryLabel, price: variant.price, imageUrl: variant.imageUrl, values: [] }
      cardByLabel.set(primaryLabel, card)
      cards.push(card)
    }
    if (secondaryEnabled) {
      const secondaryLabel = variant.options[secondaryName]
      if (secondaryLabel !== undefined) {
        card.values.push({ id: uid(), label: secondaryLabel, variantId: variant.id })
      }
    } else {
      card.variantId = variant.id
    }
  }

  return { primaryName, secondaryEnabled, secondaryName, cards }
}

// ── Componente ──────────────────────────────────────────────────────────────

export function VariantsEditor({
  variants,
  onChange,
  basePrice = '',
}: {
  variants: ProductVariantInput[]
  onChange: (variants: ProductVariantInput[]) => void
  // Preço base do produto — usado quando o card não tem preço próprio
  basePrice?: string
}) {
  // Reconstrói o estado uma única vez; depois o editor é a fonte da verdade.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [state, setState] = useState<EditorState>(() => deriveInitial(variants))

  // Aplica a mudança e propaga as variantes prontas ao formulário do produto
  function commit(next: EditorState) {
    setState(next)
    onChange(buildVariants(next, basePrice))
  }

  const primaryLabel = state.primaryName.trim()
  const addCardLabel = `Adicionar ${primaryLabel ? primaryLabel.toLowerCase() : 'variação'}`

  function setPrimaryName(name: string) {
    commit({ ...state, primaryName: name })
  }

  function setSecondaryName(name: string) {
    commit({ ...state, secondaryName: name })
  }

  function toggleSecondary(enabled: boolean) {
    // Ao ligar, garante um nome padrão e um valor em branco em cada card
    const cards = enabled
      ? state.cards.map((c) => c.values.length > 0 ? c : { ...c, values: [{ id: uid(), label: '' }] })
      : state.cards
    commit({
      ...state,
      secondaryEnabled: enabled,
      secondaryName: enabled && state.secondaryName.trim() === '' ? 'Tamanho' : state.secondaryName,
      cards,
    })
  }

  function addCard() {
    const newCard: PrimaryCard = {
      id: uid(),
      label: '',
      price: basePrice,
      imageUrl: '',
      values: state.secondaryEnabled ? [{ id: uid(), label: '' }] : [],
    }
    commit({ ...state, cards: [...state.cards, newCard] })
  }

  function updateCard(cardId: string, patch: Partial<PrimaryCard>) {
    commit({ ...state, cards: state.cards.map((c) => c.id === cardId ? { ...c, ...patch } : c) })
  }

  function removeCard(cardId: string) {
    commit({ ...state, cards: state.cards.filter((c) => c.id !== cardId) })
  }

  function addValue(cardId: string) {
    commit({
      ...state,
      cards: state.cards.map((c) => c.id === cardId
        ? { ...c, values: [...c.values, { id: uid(), label: '' }] }
        : c),
    })
  }

  function setValueLabel(cardId: string, valueId: string, label: string) {
    commit({
      ...state,
      cards: state.cards.map((c) => c.id === cardId
        ? { ...c, values: c.values.map((v) => v.id === valueId ? { ...v, label } : v) }
        : c),
    })
  }

  function removeValue(cardId: string, valueId: string) {
    commit({
      ...state,
      cards: state.cards.map((c) => c.id === cardId
        ? { ...c, values: c.values.filter((v) => v.id !== valueId) }
        : c),
    })
  }

  // Estado vazio — nenhuma variante ainda
  if (state.cards.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs leading-relaxed text-gray-400">
          Use variantes quando o mesmo produto tem versões diferentes — por exemplo uma
          camisa em várias cores. Cada cor tem sua própria foto e preço, e você pode
          listar os tamanhos disponíveis.
        </p>
        <button
          type="button"
          onClick={addCard}
          className="flex items-center gap-1.5 self-start rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <Plus size={14} />
          Adicionar variação
        </button>
      </div>
    )
  }

  const secondaryLabel = state.secondaryName.trim() || 'Tamanho'

  return (
    <div className="flex flex-col gap-3">

      {/* Configuração dos atributos (nomes e se há um segundo atributo) */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Esta variação é por
          </label>
          <input
            type="text"
            value={state.primaryName}
            onChange={(e) => setPrimaryName(e.target.value)}
            placeholder="Ex: Cor"
            className={`${inputStyle} !py-1.5 text-xs font-medium`}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={state.secondaryEnabled}
            onChange={(e) => toggleSecondary(e.target.checked)}
            className="h-3.5 w-3.5 rounded accent-gray-900"
          />
          Também tem um segundo atributo (ex: Tamanho)
        </label>

        {state.secondaryEnabled && (
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Nome do segundo atributo
            </label>
            <input
              type="text"
              value={state.secondaryName}
              onChange={(e) => setSecondaryName(e.target.value)}
              placeholder="Ex: Tamanho"
              className={`${inputStyle} !py-1.5 text-xs font-medium`}
            />
          </div>
        )}
      </div>

      {/* Um card por valor da variação principal (ex: cada cor) */}
      {state.cards.map((card) => (
        <div key={card.id} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              {primaryLabel || 'Variação'}
            </span>
            <button
              type="button"
              onClick={() => removeCard(card.id)}
              aria-label="Remover"
              className="rounded-md p-0.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <X size={15} />
            </button>
          </div>

          {/* Foto (à esquerda) + nome e preço (à direita) */}
          <div className="flex gap-3">
            <div className="w-24 shrink-0 sm:w-28">
              <label className="mb-1 block text-xs font-medium text-gray-600">Foto</label>
              <ImageUploader
                value={card.imageUrl}
                onChange={(url) => updateCard(card.id, { imageUrl: url })}
              />
            </div>

            <div className="flex flex-1 flex-col gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  {primaryLabel ? `Nome (${primaryLabel})` : 'Nome'}
                </label>
                <input
                  type="text"
                  value={card.label}
                  onChange={(e) => updateCard(card.id, { label: e.target.value })}
                  placeholder="Ex: Rosa"
                  className={`${inputStyle} !bg-white !py-1.5 !text-xs`}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Preço</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={card.price}
                    onChange={(e) => updateCard(card.id, { price: e.target.value })}
                    placeholder="0,00"
                    className={`${inputStyle} !bg-white !py-1.5 !pl-8 !text-xs`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Valores do segundo atributo desta cor (ex: tamanhos) */}
          {state.secondaryEnabled && (
            <div className="mt-3">
              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                {secondaryLabel} disponíveis
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {card.values.map((value) => (
                  <div key={value.id} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white pl-2 pr-1">
                    <input
                      type="text"
                      value={value.label}
                      onChange={(e) => setValueLabel(card.id, value.id, e.target.value)}
                      placeholder="Ex: P"
                      className="w-16 bg-transparent py-1.5 text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeValue(card.id, value.id)}
                      aria-label={`Remover ${secondaryLabel.toLowerCase()}`}
                      className="text-gray-400 transition-colors hover:text-red-500"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addValue(card.id)}
                  className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700"
                >
                  <Plus size={12} /> {secondaryLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addCard}
        className="flex items-center gap-1.5 self-start rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-100 hover:text-gray-700"
      >
        <Plus size={14} />
        {addCardLabel}
      </button>
    </div>
  )
}
