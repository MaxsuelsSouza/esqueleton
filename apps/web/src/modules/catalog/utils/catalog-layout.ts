import type { CatalogLayout, CatalogLayoutItem, CatalogComponentType } from '@esqueleton/shared'

// Layout padrão — reproduz exatamente a estrutura atual do catálogo.
// Quando o admin não configurou nada (catalogLayout é null), esses itens são usados.
export const DEFAULT_LAYOUT_ITEMS: CatalogLayoutItem[] = [
  { i: 'announcements',  x: 0,  y: 0, w: 12, h: 1 },
  { i: 'search',         x: 0,  y: 1, w: 10, h: 1, config: { searchStyle: 'full-width' } },
  { i: 'display-toggle', x: 10, y: 1, w: 2,  h: 1 },
  { i: 'filters',        x: 0,  y: 2, w: 3,  h: 8 },
  { i: 'featured',       x: 3,  y: 2, w: 9,  h: 4, config: { featuredStyle: 'carousel' } },
  { i: 'products',       x: 3,  y: 6, w: 9,  h: 8, config: { gridColumns: 3, cardStyle: 'default' } },
]

// Resolve o layout salvo — retorna os itens salvos ou o padrão se não houver configuração
export function resolveCatalogLayout(saved?: CatalogLayout | null): CatalogLayoutItem[] {
  if (!saved || !saved.items || saved.items.length === 0) return DEFAULT_LAYOUT_ITEMS
  return saved.items
}

// Busca um componente específico no layout pelo tipo (retorna undefined se não está no layout)
export function findLayoutItem(
  items: CatalogLayoutItem[],
  type: CatalogComponentType,
): CatalogLayoutItem | undefined {
  return items.find(item => item.i === type)
}

// Posição padrão para um novo componente adicionado ao grid — ocupa 12 colunas no fundo
export function defaultPositionForType(type: CatalogComponentType, maxY: number): CatalogLayoutItem {
  const defaults: Record<CatalogComponentType, Omit<CatalogLayoutItem, 'y'>> = {
    announcements:    { i: 'announcements',  x: 0, w: 12, h: 1 },
    search:           { i: 'search',         x: 0, w: 10, h: 1, config: { searchStyle: 'full-width' } },
    'display-toggle': { i: 'display-toggle', x: 10, w: 2, h: 1 },
    filters:          { i: 'filters',        x: 0, w: 3,  h: 6 },
    featured:         { i: 'featured',       x: 0, w: 12, h: 4, config: { featuredStyle: 'carousel' } },
    products:         { i: 'products',       x: 0, w: 12, h: 8, config: { gridColumns: 3, cardStyle: 'default' } },
    text:             { i: 'text',           x: 0, w: 12, h: 2, config: { textContent: 'Seu texto aqui', textStyle: 'normal' } },
  }
  return { ...defaults[type], y: maxY + 1 }
}
