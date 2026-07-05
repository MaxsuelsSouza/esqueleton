'use client'

// Menu lateral do site público (somente mobile) — aberto pelo botão de
// três traços no canto esquerdo do header. Exibe todas as categorias
// (com subcategorias expansíveis) e as promoções ativas da loja.
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, ChevronDown, ChevronRight, Tag, LayoutGrid } from 'lucide-react'
import { useStoreSlug } from '@/shared/hooks/useStoreSlug'
import { categoriesService } from '@/modules/categories/services/categories.service'
import { promotionsService } from '@/modules/promotions/services/promotions.service'
import { buildCategoryTree } from '@/modules/categories/utils/categories'
import { isPromotionActive } from '@/modules/promotions/utils/promotions'
import type { Category, Promotion } from '@esqueleton/shared'

interface MobileMenuDrawerProps {
  open: boolean
  onClose: () => void
}

export function MobileMenuDrawer({ open, onClose }: MobileMenuDrawerProps) {
  const slug = useStoreSlug()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])

  // Carrega categorias e promoções da loja uma única vez
  useEffect(() => {
    if (!slug) return
    Promise.all([
      categoriesService.listPublicCategories(slug),
      promotionsService.listPublicPromotions(slug),
    ])
      .then(([cats, promos]) => {
        setCategories(buildCategoryTree(cats))
        // A API já retorna só promoções com a flag ativa — aqui filtra
        // também a janela de data/horário para não exibir promoção vencida
        setPromotions(promos.filter(isPromotionActive))
      })
      .catch(() => {})
  }, [slug])

  // Trava o scroll da página enquanto o menu está aberto
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Fecha o menu e navega para o destino escolhido
  function goTo(path: string) {
    onClose()
    router.push(path)
  }

  return (
    <div className={`fixed inset-0 z-[60] md:hidden ${open ? '' : 'pointer-events-none'}`}>
      {/* Fundo escurecido — clicar fora fecha o menu */}
      <div
        onClick={onClose}
        aria-hidden
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Painel deslizante */}
      <nav
        aria-label="Menu da loja"
        className={`absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabeçalho do menu */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold uppercase tracking-wider text-gray-500">Menu</span>
          <button onClick={onClose} aria-label="Fechar menu" className="text-gray-500 hover:text-black">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          {/* Link para o catálogo completo */}
          <button
            onClick={() => goTo(`/loja/${slug}`)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            <LayoutGrid size={16} className="text-gray-400" />
            Todos os produtos
          </button>

          {/* ── Categorias ── */}
          {categories.length > 0 && (
            <div className="mt-3">
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Categorias
              </p>
              <CategoryMenuTree
                categories={categories}
                onSelect={(id) => goTo(`/loja/${slug}?categoria=${id}`)}
              />
            </div>
          )}

          {/* ── Promoções ── */}
          {promotions.length > 0 && (
            <div className="mt-4">
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Promoções
              </p>
              {promotions.map((promo) => (
                <button
                  key={promo.id}
                  onClick={() => goTo(`/loja/${slug}/promocao/${promo.id}`)}
                  className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-gray-50"
                >
                  <Tag
                    size={16}
                    className="mt-0.5 shrink-0"
                    style={{ color: promo.color ?? 'var(--color-primary, #111827)' }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-800">{promo.name}</span>
                    {promo.description && (
                      <span className="block truncate text-xs text-gray-400">{promo.description}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>
    </div>
  )
}

// ── Árvore de categorias do menu ────────────────────────────────────────────
// Clicar no nome navega para o catálogo filtrado; a seta expande as subcategorias

interface CategoryMenuTreeProps {
  categories: Category[]
  onSelect: (id: string) => void
  level?: number
}

function CategoryMenuTree({ categories, onSelect, level = 0 }: CategoryMenuTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className={level > 0 ? 'ml-4 border-l border-gray-100 pl-1' : ''}>
      {categories.map((cat) => {
        const hasChildren = !!cat.children?.length
        const isExpanded = expandedIds.has(cat.id)

        return (
          <div key={cat.id}>
            <div className="flex items-center">
              <button
                onClick={() => onSelect(cat.id)}
                className="min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                {cat.name}
              </button>

              {/* Seta para expandir/recolher subcategorias */}
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(cat.id)}
                  aria-label={isExpanded ? `Recolher ${cat.name}` : `Expandir ${cat.name}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
            </div>

            {hasChildren && isExpanded && (
              <CategoryMenuTree categories={cat.children!} onSelect={onSelect} level={level + 1} />
            )}
          </div>
        )
      })}
    </div>
  )
}
