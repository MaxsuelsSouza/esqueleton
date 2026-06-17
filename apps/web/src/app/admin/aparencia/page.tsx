'use client'

// Page builder visual do catálogo — o admin arrasta e redimensiona componentes
// em um grid de 12 colunas para configurar a aparência da loja pública.
import { useAparenciaPage } from './page.hooks'
import { GridLayout, verticalCompactor } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { useState, useRef, useEffect } from 'react'
import {
  Palette, Save, Check, Plus, X, GripVertical, RotateCcw,
  Search, Sparkles, SlidersHorizontal, LayoutGrid, ToggleLeft, Megaphone, Type,
} from 'lucide-react'
import type { CatalogComponentType, CatalogComponentConfig, CatalogLayoutItem } from '@esqueleton/shared'

// Extrai o tipo base de um ID de componente (ex: 'text-1' → 'text', 'search' → 'search')
function getComponentType(id: string): CatalogComponentType {
  const base = id.replace(/-\d+$/, '')
  return base as CatalogComponentType
}

// Metadados visuais de cada tipo de componente — ícone, nome e cor
const COMPONENT_META: Record<CatalogComponentType, { icon: typeof Search; label: string; color: string }> = {
  search:           { icon: Search,              label: 'Busca',          color: '#3b82f6' },
  featured:         { icon: Sparkles,            label: 'Destaque',       color: '#f59e0b' },
  filters:          { icon: SlidersHorizontal,   label: 'Filtros',        color: '#8b5cf6' },
  products:         { icon: LayoutGrid,          label: 'Produtos',       color: '#10b981' },
  'display-toggle': { icon: ToggleLeft,          label: 'Exibição',       color: '#6366f1' },
  announcements:    { icon: Megaphone,           label: 'Anúncios',       color: '#ef4444' },
  text:             { icon: Type,                label: 'Texto',          color: '#64748b' },
}

export default function AparenciaPage() {
  const {
    layoutItems,
    selectedItem,
    selectedItemData,
    setSelectedItem,
    availableToAdd,
    addMenuOpen,
    setAddMenuOpen,
    isLoading,
    isSaving,
    saveError,
    saveSuccess,
    handleLayoutChange,
    addComponent,
    removeComponent,
    updateConfig,
    resetLayout,
    handleSave,
  } = useAparenciaPage()

  // Mede a largura do container para o react-grid-layout (precisa de width fixa em pixels)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(900)

  useEffect(() => {
    function updateWidth() {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600" />
      </div>
    )
  }

  // Converte CatalogLayoutItem[] para o formato do react-grid-layout
  const gridLayout = layoutItems.map((item) => ({
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: 1,
    minH: 1,
  }))

  return (
    <div className="flex h-full flex-col">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Palette size={22} />
            Aparência do catálogo
          </h1>
          <p className="mt-0.5 text-xs text-gray-400">
            Arraste e redimensione os componentes. Clique para configurar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão restaurar layout padrão */}
          <button
            onClick={resetLayout}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700"
          >
            <RotateCcw size={14} />
            Restaurar padrão
          </button>

          {/* Botão incluir componente */}
          <div className="relative">
            <button
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              disabled={availableToAdd.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:border-gray-400 disabled:opacity-40"
            >
              <Plus size={14} />
              Incluir componente
            </button>

            {/* Dropdown de componentes disponíveis */}
            {addMenuOpen && availableToAdd.length > 0 && (
              <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                {availableToAdd.map(({ type, label }) => {
                  const meta = COMPONENT_META[type]
                  const Icon = meta.icon
                  return (
                    <button
                      key={type}
                      onClick={() => addComponent(type)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        <Icon size={14} />
                      </span>
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Botão salvar */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-primary, #000000)' }}
          >
            {isSaving ? (
              <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Salvando...</>
            ) : saveSuccess ? (
              <><Check size={14} /> Salvo!</>
            ) : (
              <><Save size={14} /> Salvar</>
            )}
          </button>

          {saveError && <span className="text-xs text-red-500">{saveError}</span>}
        </div>
      </div>

      {/* Fechar dropdown ao clicar fora */}
      {addMenuOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setAddMenuOpen(false)} />
      )}

      {/* ── Canvas + Settings ────────────────────────────────────────────── */}
      <div className="flex flex-1 gap-4">

        {/* Canvas com o grid */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white p-2"
          onClick={(e) => {
            // Deseleciona ao clicar no fundo
            if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-grid-bg]')) {
              setSelectedItem(null)
            }
          }}
        >
          <div data-grid-bg className="min-h-[600px] bg-gray-50/50">
            <GridLayout
              className="layout"
              layout={gridLayout}
              width={containerWidth - 20}
              gridConfig={{ cols: 12, rowHeight: 60, margin: [10, 10], containerPadding: null, maxRows: Infinity }}
              dragConfig={{ enabled: true, handle: '.drag-handle', bounded: false, threshold: 3 }}
              resizeConfig={{ enabled: true, handles: ['se'] }}
              compactor={verticalCompactor}
              onLayoutChange={handleLayoutChange}
            >
              {layoutItems.map((item) => (
                <div
                  key={item.i}
                  onClick={(e) => { e.stopPropagation(); setSelectedItem(item.i) }}
                >
                  <GridItemContent
                    item={item}
                    isSelected={selectedItem === item.i}
                    onRemove={() => removeComponent(item.i)}
                    onUpdateConfig={(config) => updateConfig(item.i, config)}
                  />
                </div>
              ))}
            </GridLayout>
          </div>
        </div>

        {/* Painel de configurações — aparece quando um item está selecionado */}
        {selectedItemData && (
          <SettingsPanel
            item={selectedItemData}
            onUpdate={(config) => updateConfig(selectedItemData.i, config)}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </div>
    </div>
  )
}

// ── Item do grid ───────────────────────────────────────────────────────────

function GridItemContent({ item, isSelected, onRemove, onUpdateConfig }: {
  item: CatalogLayoutItem
  isSelected: boolean
  onRemove: () => void
  onUpdateConfig: (config: CatalogComponentConfig) => void
}) {
  const type = getComponentType(item.i)
  const meta = COMPONENT_META[type]
  if (!meta) return null
  const Icon = meta.icon

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-lg border-2 transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-50/50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      {/* Header com drag handle e botão remover */}
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-2 py-1.5">
        <span className="drag-handle cursor-grab text-gray-300 active:cursor-grabbing">
          <GripVertical size={14} />
        </span>
        <span
          className="flex h-5 w-5 items-center justify-center rounded text-white"
          style={{ backgroundColor: meta.color }}
        >
          <Icon size={11} />
        </span>
        <span className="flex-1 text-xs font-semibold text-gray-700">{meta.label}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="rounded p-0.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <X size={12} />
        </button>
      </div>

      {/* Corpo — texto usa edição inline, outros usam placeholder visual */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2">
        {type === 'text' ? (
          <InlineTextEditor
            content={item.config?.textContent ?? ''}
            textStyle={item.config?.textStyle ?? 'normal'}
            onChange={(textContent) => onUpdateConfig({ textContent })}
          />
        ) : (
          <ComponentPlaceholder type={type} config={item.config} />
        )}
      </div>
    </div>
  )
}

// Placeholder visual para cada tipo de componente dentro do canvas
function ComponentPlaceholder({ type, config }: { type: CatalogComponentType; config?: CatalogComponentConfig }) {
  switch (type) {
    case 'search':
      return (
        <div className="flex w-full items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5">
          <Search size={12} className="text-gray-400" />
          <span className="text-[10px] text-gray-400">
            {config?.searchStyle === 'compact' ? 'Busca compacta' : 'Buscar no catálogo...'}
          </span>
        </div>
      )
    case 'featured':
      return (
        <div className="flex w-full flex-col items-center gap-1 rounded-lg bg-amber-50 p-2">
          <Sparkles size={14} className="text-amber-500" />
          <span className="text-[10px] font-medium text-amber-600">
            {config?.featuredStyle === 'horizontal-strip' ? 'Faixa horizontal' : 'Carrossel'}
          </span>
        </div>
      )
    case 'filters':
      return (
        <div className="flex w-full flex-col gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-1.5 rounded bg-gray-200" style={{ width: `${70 - i * 10}%` }} />
          ))}
        </div>
      )
    case 'products': {
      const cols = config?.gridColumns ?? 3
      return (
        <div className="grid w-full gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols * 2 }).map((_, i) => (
            <div key={i} className="rounded bg-gray-200" style={{ aspectRatio: config?.cardStyle === 'compact' ? '3/1' : '1/1.2' }} />
          ))}
        </div>
      )
    }
    case 'display-toggle':
      return (
        <div className="flex gap-1">
          <div className="h-5 w-5 rounded border border-gray-300 bg-gray-100" />
          <div className="h-5 w-5 rounded border border-gray-200" />
        </div>
      )
    case 'announcements':
      return (
        <div className="flex w-full items-center justify-center rounded bg-gray-800 py-1">
          <div className="h-1 w-16 rounded bg-gray-500" />
        </div>
      )
    case 'text': {
      const style = config?.textStyle ?? 'normal'
      const text = config?.textContent || 'Seu texto aqui'
      const preview = text.length > 40 ? text.slice(0, 40) + '…' : text
      return (
        <div className="w-full px-1">
          {style === 'heading' && <p className="truncate text-sm font-bold text-gray-700">{preview}</p>}
          {style === 'highlight' && (
            <p className="truncate rounded px-2 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: 'var(--color-primary, #000)' }}>{preview}</p>
          )}
          {style === 'banner' && (
            <div className="truncate rounded-lg border border-gray-200 px-2 py-1 text-center text-[10px] font-medium text-gray-600">{preview}</div>
          )}
          {style === 'normal' && <p className="truncate text-[10px] text-gray-500">{preview}</p>}
        </div>
      )
    }
    default:
      return null
  }
}

// ── Editor de texto inline — permite editar o texto direto no canvas ───────

function InlineTextEditor({ content, textStyle, onChange }: {
  content: string
  textStyle: string
  onChange: (text: string) => void
}) {
  const styleClasses: Record<string, string> = {
    normal:    'text-[11px] text-gray-500',
    heading:   'text-sm font-bold text-gray-700',
    highlight: 'text-[11px] font-medium text-gray-600',
    banner:    'text-[11px] font-medium text-gray-600 text-center',
  }

  return (
    <div className="w-full" onClick={(e) => e.stopPropagation()}>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onMouseDown={(e) => e.stopPropagation()}
        placeholder="Digite o texto..."
        maxLength={500}
        className={`w-full resize-none border-0 bg-transparent outline-none placeholder:text-gray-300 ${styleClasses[textStyle] ?? styleClasses.normal}`}
        rows={Math.max(1, Math.ceil(content.length / 40) || 1)}
      />
    </div>
  )
}

// ── Painel de configurações ────────────────────────────────────────────────

function SettingsPanel({ item, onUpdate, onClose }: {
  item: CatalogLayoutItem
  onUpdate: (config: CatalogComponentConfig) => void
  onClose: () => void
}) {
  const type = getComponentType(item.i)
  const meta = COMPONENT_META[type]
  if (!meta) return null
  const Icon = meta.icon
  const config = item.config ?? {}

  return (
    <div className="w-64 shrink-0 rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: meta.color }}
          >
            <Icon size={13} />
          </span>
          <h3 className="text-sm font-semibold text-gray-900">{meta.label}</h3>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      {/* Posição atual (somente leitura) */}
      <div className="mb-4 grid grid-cols-4 gap-2 text-center">
        <PositionBadge label="X" value={item.x} />
        <PositionBadge label="Y" value={item.y} />
        <PositionBadge label="L" value={item.w} />
        <PositionBadge label="A" value={item.h} />
      </div>

      {/* Configurações específicas do componente */}
      <div className="space-y-3">
        {type === 'search' && (
          <SelectField
            label="Estilo"
            value={config.searchStyle ?? 'full-width'}
            options={[
              { value: 'full-width', label: 'Expandida' },
              { value: 'compact', label: 'Compacta (ícone)' },
            ]}
            onChange={(v) => onUpdate({ searchStyle: v as 'full-width' | 'compact' })}
          />
        )}

        {type === 'featured' && (
          <SelectField
            label="Estilo"
            value={config.featuredStyle ?? 'carousel'}
            options={[
              { value: 'carousel', label: 'Carrossel' },
              { value: 'horizontal-strip', label: 'Faixa horizontal' },
            ]}
            onChange={(v) => onUpdate({ featuredStyle: v as 'carousel' | 'horizontal-strip' })}
          />
        )}

        {type === 'products' && (
          <>
            <SelectField
              label="Colunas (desktop)"
              value={String(config.gridColumns ?? 3)}
              options={[
                { value: '2', label: '2 colunas' },
                { value: '3', label: '3 colunas' },
                { value: '4', label: '4 colunas' },
              ]}
              onChange={(v) => onUpdate({ gridColumns: Number(v) as 2 | 3 | 4 })}
            />
            <SelectField
              label="Estilo do cartão"
              value={config.cardStyle ?? 'default'}
              options={[
                { value: 'default', label: 'Com imagem' },
                { value: 'compact', label: 'Compacto' },
              ]}
              onChange={(v) => onUpdate({ cardStyle: v as 'default' | 'compact' })}
            />
          </>
        )}

        {type === 'display-toggle' && (
          <SelectField
            label="Modo padrão"
            value={config.lockedDisplayMode ?? 'grid'}
            options={[
              { value: 'grid', label: 'Grade' },
              { value: 'list', label: 'Lista' },
            ]}
            onChange={(v) => onUpdate({ lockedDisplayMode: v as 'grid' | 'list' })}
          />
        )}

        {type === 'text' && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Texto</label>
              <textarea
                value={config.textContent ?? ''}
                onChange={(e) => onUpdate({ textContent: e.target.value })}
                maxLength={500}
                rows={3}
                placeholder="Digite o texto aqui..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-gray-400 focus:bg-white"
              />
              <span className="text-[10px] text-gray-300">{(config.textContent ?? '').length}/500</span>
            </div>
            <SelectField
              label="Aparência"
              value={config.textStyle ?? 'normal'}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'heading', label: 'Título' },
                { value: 'highlight', label: 'Destaque colorido' },
                { value: 'banner', label: 'Banner com borda' },
              ]}
              onChange={(v) => onUpdate({ textStyle: v as 'normal' | 'heading' | 'highlight' | 'banner' })}
            />
          </>
        )}

        {(type === 'filters' || type === 'announcements') && (
          <p className="text-xs text-gray-400">Sem configurações adicionais. Ajuste a posição e o tamanho no grid.</p>
        )}
      </div>
    </div>
  )
}

function PositionBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-gray-50 px-1 py-1.5">
      <div className="text-[9px] font-medium uppercase text-gray-400">{label}</div>
      <div className="text-xs font-bold text-gray-700">{value}</div>
    </div>
  )
}

function SelectField({ label, value, options, onChange }: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-gray-400 focus:bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
