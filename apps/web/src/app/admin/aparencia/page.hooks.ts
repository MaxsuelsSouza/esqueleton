'use client'

// Hook que concentra toda a lógica do page builder visual do catálogo.
// Gerencia o estado do grid (itens, posições, seleção), e salva no StoreProfile.
import { useState, useEffect, useCallback } from 'react'
import { storeProfileService } from '@/modules/store-profile/services/store-profile.service'
import { DEFAULT_LAYOUT_ITEMS, defaultPositionForType } from '@/modules/catalog/utils/catalog-layout'
import type { StoreProfile, CatalogLayoutItem, CatalogComponentType, CatalogComponentConfig } from '@esqueleton/shared'
import type { Layout, LayoutItem } from 'react-grid-layout'

// Todos os tipos de componentes disponíveis para o admin adicionar
export const AVAILABLE_COMPONENTS: { type: CatalogComponentType; label: string }[] = [
  { type: 'announcements',   label: 'Anúncios' },
  { type: 'search',          label: 'Busca' },
  { type: 'display-toggle',  label: 'Alternador de exibição' },
  { type: 'filters',         label: 'Filtros' },
  { type: 'featured',        label: 'Destaque' },
  { type: 'products',        label: 'Produtos' },
  { type: 'text',             label: 'Texto' },
]

export function useAparenciaPage() {
  const [profile, setProfile] = useState<StoreProfile | null>(null)
  const [layoutItems, setLayoutItems] = useState<CatalogLayoutItem[]>(DEFAULT_LAYOUT_ITEMS)
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)

  // Carrega o perfil e o layout salvo
  useEffect(() => {
    const token = localStorage.getItem('admin_token') ?? ''
    storeProfileService
      .getProfile(token)
      .then((p) => {
        setProfile(p)
        if (p.catalogLayout && (p.catalogLayout as { items?: unknown[] }).items?.length) {
          setLayoutItems((p.catalogLayout as { items: CatalogLayoutItem[] }).items)
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  // Tipos que permitem múltiplas instâncias (texto pode ser adicionado várias vezes)
  const MULTI_INSTANCE_TYPES: CatalogComponentType[] = ['text']

  // Componentes que ainda podem ser adicionados — tipos únicos somem quando já existem,
  // tipos múltiplos (texto) ficam sempre disponíveis
  const availableToAdd = AVAILABLE_COMPONENTS.filter(
    (c) => MULTI_INSTANCE_TYPES.includes(c.type) || !layoutItems.some((item) => item.i === c.type),
  )

  // Chamado pelo react-grid-layout quando o usuário arrasta ou redimensiona
  const handleLayoutChange = useCallback((newLayout: Layout) => {
    setLayoutItems((prev) =>
      prev.map((item) => {
        const updated = newLayout.find((l: LayoutItem) => l.i === item.i)
        if (!updated) return item
        return { ...item, x: updated.x, y: updated.y, w: updated.w, h: updated.h }
      }),
    )
  }, [])

  // Gera um ID único para componentes que permitem múltiplas instâncias (text-1, text-2…)
  function generateId(type: CatalogComponentType): string {
    if (!MULTI_INSTANCE_TYPES.includes(type)) return type
    const existing = layoutItems.filter((item) => item.i.startsWith(type + '-'))
    const maxNum = existing.reduce((max, item) => {
      const num = parseInt(item.i.split('-').pop() ?? '0', 10)
      return Math.max(max, num)
    }, 0)
    return `${type}-${maxNum + 1}`
  }

  // Adiciona um componente ao grid
  function addComponent(type: CatalogComponentType) {
    const maxY = layoutItems.reduce((max, item) => Math.max(max, item.y + item.h), 0)
    const id = generateId(type)
    const newItem = { ...defaultPositionForType(type, maxY), i: id }
    setLayoutItems((prev) => [...prev, newItem])
    setAddMenuOpen(false)
    setSelectedItem(id)
  }

  // Remove um componente do grid
  function removeComponent(id: string) {
    setLayoutItems((prev) => prev.filter((item) => item.i !== id))
    if (selectedItem === id) setSelectedItem(null)
  }

  // Atualiza as configurações de um componente específico
  function updateConfig(id: string, config: CatalogComponentConfig) {
    setLayoutItems((prev) =>
      prev.map((item) =>
        item.i === id ? { ...item, config: { ...item.config, ...config } } : item,
      ),
    )
  }

  // Restaura o layout padrão
  function resetLayout() {
    setLayoutItems(DEFAULT_LAYOUT_ITEMS)
    setSelectedItem(null)
  }

  // Salva o layout no StoreProfile
  async function handleSave() {
    if (!profile) return

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    const token = localStorage.getItem('admin_token') ?? ''
    try {
      const updated = await storeProfileService.updateProfile(
        {
          storeName: profile.storeName,
          address: profile.address,
          whatsapp: profile.whatsapp,
          instagram: profile.instagram,
          logoUrl: profile.logoUrl,
          themeColor: profile.themeColor,
          announcements: profile.announcements,
          catalogLayout: { items: layoutItems },
        },
        token,
      )
      setProfile(updated)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError('Erro ao salvar. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  // Item selecionado (para o painel de configurações)
  const selectedItemData = layoutItems.find((item) => item.i === selectedItem) ?? null

  return {
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
  }
}
