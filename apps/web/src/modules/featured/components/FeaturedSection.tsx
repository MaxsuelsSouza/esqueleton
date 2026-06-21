'use client'

// Seção de produtos em destaque — exibe produtos selecionados no topo da página
// Suporta dois modos: grade estática (padrão) e carrossel automático
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ProductCard } from '@/modules/catalog/components/ProductCard'
import { useStoreProfile } from '@/modules/store-profile/contexts/store-profile-context'
import type { Product } from '@esqueleton/shared'
import type { PromotedProduct } from '@/modules/promotions/utils/promotions'
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'

interface FeaturedSectionProps {
  products: PromotedProduct[]
  // Título principal da seção
  title?: string
  // Texto da tag exibida no canto direito do cabeçalho
  tag?: string
  // ID e nome do destaque — usados para registrar eventos de analytics
  featuredId?: string
  featuredName?: string
  // Exibe em carrossel automático em vez de grade estática
  carousel?: boolean
}

// Intervalo do avanço automático em milissegundos
const AUTO_ADVANCE_MS = 2000
// Duração da animação de deslize em milissegundos
const TRANSITION_MS = 600

// Breakpoints do Tailwind — quantos cards por página em cada faixa de largura
// Mobile (<640px): 2 | Tablet (640–1023px): 3 | Desktop (≥1024px): 4
function getItemsPerPage(): number {
  if (typeof window === 'undefined') return 4
  if (window.innerWidth >= 1024) return 4
  if (window.innerWidth >= 640) return 3
  return 2
}

// Classe CSS de grid correspondente ao número de colunas
function gridColsClass(cols: number): string {
  if (cols === 2) return 'grid-cols-2'
  if (cols === 3) return 'grid-cols-3'
  return 'grid-cols-4'
}

export function FeaturedSection({
  products,
  title = 'Em destaque',
  tag = 'Destaque',
  featuredId,
  featuredName,
  carousel = false,
}: FeaturedSectionProps) {
  const { profile } = useStoreProfile()
  const themeColor = profile.themeColor ?? '#000000'

  if (products.length === 0) return null

  return (
    // Fundo usa a cor do tema com 15% de opacidade para criar um tom suave
    <section
      className="mb-10 rounded-2xl p-3 sm:p-4"
      style={{ backgroundColor: themeColor + '26' }}
    >

      {/* Cabeçalho centralizado */}
      <div className="mb-4 flex flex-col items-center gap-2 text-center">
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: themeColor }}
        >
          {tag}
        </span>
        <div className="flex items-center gap-2">
          <Sparkles size={18} style={{ color: themeColor }} />
          <h2 className="text-lg font-bold text-gray-900 sm:text-xl">{title}</h2>
        </div>
      </div>

      {carousel ? (
        <FeaturedCarousel
          items={products}
          themeColor={themeColor}
          featuredId={featuredId}
          featuredName={featuredName ?? title}
        />
      ) : (
        /* Produtos em grade — 2 por linha no mobile, 3 no tablet, 4 no desktop */
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map(({ product, badge, badgeColor, promotionId, promotionName, originalPrice, discountPercent }) => (
            <ProductCard
              key={product.id}
              product={product}
              badge={badge}
              badgeColor={badgeColor}
              promotionId={promotionId}
              promotionName={promotionName}
              originalPrice={originalPrice}
              discountPercent={discountPercent}
              displayMode="grid"
              featuredId={featuredId}
              featuredName={featuredName ?? title}
            />
          ))}
        </div>
      )}

    </section>
  )
}

// ── Carrossel de produtos em destaque ───────────────────────────────────────
// Usa CSS transform + transition para deslizar fluidamente entre páginas.
// Responsivo: adapta a quantidade de cards por página ao tamanho da tela
// (2 no mobile, 3 no tablet, 4 no desktop).
function FeaturedCarousel({
  items,
  themeColor,
  featuredId,
  featuredName,
}: {
  items: PromotedProduct[]
  themeColor: string
  featuredId?: string
  featuredName: string
}) {
  // Quantidade de cards visíveis por página — muda com o tamanho da tela
  const [itemsPerPage, setItemsPerPage] = useState(getItemsPerPage)

  useEffect(() => {
    function handleResize() {
      const next = getItemsPerPage()
      setItemsPerPage((prev) => {
        if (prev === next) return prev
        // Volta à primeira página ao mudar de breakpoint para evitar página inválida
        setCurrentPage(0)
        return next
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const totalPages = Math.ceil(items.length / itemsPerPage)
  const [currentPage, setCurrentPage] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  // ── Drag / swipe state ──────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false)
  // Indica que o arraste realmente se moveu (bloqueia cliques nos cards só nesse caso)
  const [hasDragMoved, setHasDragMoved] = useState(false)
  // Deslocamento em pixels enquanto o dedo/mouse se move
  const [dragOffset, setDragOffset] = useState(0)
  // Posição X e Y onde o arraste começou
  const dragStartX = useRef(0)
  const dragStartY = useRef(0)
  // Se o arraste ultrapassou o limiar mínimo (evita cliques virarem swipe)
  const dragMoved = useRef(false)
  // Direção do gesto já foi decidida? (horizontal = swipe, vertical = scroll da página)
  const directionLocked = useRef<'horizontal' | 'vertical' | null>(null)

  // Refs espelhando o state para acesso dentro dos listeners nativos (que não recriam a cada render)
  const isDraggingRef = useRef(false)
  const dragOffsetRef = useRef(0)
  const currentPageRef = useRef(currentPage)
  const totalPagesRef = useRef(totalPages)
  const isTransitioningRef = useRef(isTransitioning)
  const isPausedRef = useRef(isPaused)

  // Mantém as refs sincronizadas com o state
  currentPageRef.current = currentPage
  totalPagesRef.current = totalPages
  isTransitioningRef.current = isTransitioning
  isPausedRef.current = isPaused

  const goTo = useCallback((page: number) => {
    if (isTransitioningRef.current) return
    setIsTransitioning(true)
    isTransitioningRef.current = true
    setCurrentPage(page)
    currentPageRef.current = page
    setTimeout(() => {
      setIsTransitioning(false)
      isTransitioningRef.current = false
    }, TRANSITION_MS)
  }, [])

  const goToNext = useCallback(() => {
    goTo((currentPageRef.current + 1) % totalPagesRef.current)
  }, [goTo])

  const goToPrev = useCallback(() => {
    goTo((currentPageRef.current - 1 + totalPagesRef.current) % totalPagesRef.current)
  }, [goTo])

  // Reinicia o timer automático quando o usuário navega manualmente
  const resetAutoAdvance = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (isPausedRef.current) return
    intervalRef.current = setInterval(() => {
      if (isTransitioningRef.current) return
      setIsTransitioning(true)
      isTransitioningRef.current = true
      setCurrentPage((prev) => {
        const next = (prev + 1) % totalPagesRef.current
        currentPageRef.current = next
        return next
      })
      setTimeout(() => {
        setIsTransitioning(false)
        isTransitioningRef.current = false
      }, TRANSITION_MS)
    }, AUTO_ADVANCE_MS)
  }, [])

  // Avanço automático — para quando o mouse está sobre o carrossel ou arrastando
  useEffect(() => {
    if (totalPages <= 1) return
    if (isPaused || isDragging) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    resetAutoAdvance()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [totalPages, isPaused, isDragging, resetAutoAdvance])

  // ── Drag / swipe handlers ───────────────────────────────────────────
  // Limiar mínimo em pixels para considerar como arraste (evita cliques acidentais)
  const DRAG_THRESHOLD = 8
  // Porcentagem da largura do container que precisa arrastar para trocar de página
  const SWIPE_RATIO = 0.15

  function handleDragStart(clientX: number, clientY: number) {
    if (isTransitioningRef.current) return
    isDraggingRef.current = true
    dragOffsetRef.current = 0
    setIsDragging(true)
    setIsPaused(true)
    isPausedRef.current = true
    dragStartX.current = clientX
    dragStartY.current = clientY
    dragMoved.current = false
    directionLocked.current = null
    setDragOffset(0)
  }

  // Retorna true se o movimento é horizontal (e portanto deve bloquear o scroll da página)
  function handleDragMove(clientX: number, clientY: number): boolean {
    if (!isDraggingRef.current) return false

    const deltaX = clientX - dragStartX.current
    const deltaY = clientY - dragStartY.current

    // Decide a direção do gesto na primeira vez que ultrapassa o limiar
    if (!directionLocked.current && (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)) {
      directionLocked.current = Math.abs(deltaX) >= Math.abs(deltaY) ? 'horizontal' : 'vertical'
    }

    // Se o gesto é vertical, não interferir — deixa o browser rolar a página
    if (directionLocked.current === 'vertical') return false

    if (Math.abs(deltaX) > DRAG_THRESHOLD) {
      dragMoved.current = true
      setHasDragMoved(true)
    }
    dragOffsetRef.current = deltaX
    setDragOffset(deltaX)
    return directionLocked.current === 'horizontal'
  }

  function handleDragEnd() {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    setIsDragging(false)

    const cw = trackRef.current?.offsetWidth ?? 1
    const ratio = dragOffsetRef.current / cw

    if (Math.abs(ratio) >= SWIPE_RATIO && directionLocked.current === 'horizontal') {
      if (ratio < 0 && currentPageRef.current < totalPagesRef.current - 1) {
        goTo(currentPageRef.current + 1)
      } else if (ratio > 0 && currentPageRef.current > 0) {
        goTo(currentPageRef.current - 1)
      }
    }

    dragOffsetRef.current = 0
    setDragOffset(0)
    setHasDragMoved(false)
    directionLocked.current = null
    setIsPaused(false)
    isPausedRef.current = false
  }

  // Mouse — não inicia arraste se o clique foi em um botão ou link (permite clicks nos cards)
  function onMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    if (target.closest('button, a')) return
    e.preventDefault()
    handleDragStart(e.clientX, e.clientY)
  }
  function onMouseMove(e: React.MouseEvent) {
    handleDragMove(e.clientX, e.clientY)
  }
  function onMouseUp() {
    handleDragEnd()
  }
  function onMouseLeave() {
    if (isDraggingRef.current) handleDragEnd()
    setIsPaused(false)
    isPausedRef.current = false
  }

  // Touch — registrado como listener nativo com { passive: false } para poder
  // chamar preventDefault() e impedir o scroll do browser durante o swipe horizontal
  useEffect(() => {
    const el = trackRef.current
    if (!el) return

    function onTouchStart(e: TouchEvent) {
      // Não inicia arraste se o toque foi em um botão ou link (permite clicks nos cards)
      const target = e.target as HTMLElement
      if (target.closest('button, a')) return
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY)
    }

    function onTouchMove(e: TouchEvent) {
      const isHorizontal = handleDragMove(e.touches[0].clientX, e.touches[0].clientY)
      // Bloqueia o scroll da página apenas quando o gesto é claramente horizontal
      if (isHorizontal) e.preventDefault()
    }

    function onTouchEnd() {
      handleDragEnd()
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePrev() {
    goToPrev()
    resetAutoAdvance()
  }

  function handleNext() {
    goToNext()
    resetAutoAdvance()
  }

  function handleDotClick(page: number) {
    goTo(page)
    resetAutoAdvance()
  }

  // Monta as páginas de produtos de acordo com a quantidade de colunas atual
  const pages = useMemo(() => {
    const result: PromotedProduct[][] = []
    for (let i = 0; i < items.length; i += itemsPerPage) {
      result.push(items.slice(i, i + itemsPerPage))
    }
    return result
  }, [items, itemsPerPage])

  // Deslocamento horizontal: página base + arraste em tempo real
  const containerWidth = trackRef.current?.offsetWidth ?? 0
  const baseTranslate = -(currentPage * 100)
  const dragPercent = containerWidth > 0 ? (dragOffset / containerWidth) * 100 : 0
  const translateX = baseTranslate + dragPercent

  const colsClass = gridColsClass(itemsPerPage)

  // Se tem apenas 1 página, não precisa de controles
  if (totalPages <= 1) {
    return (
      <div className={`grid ${colsClass} gap-3`}>
        {items.map(({ product, badge, badgeColor, promotionId, promotionName, originalPrice, discountPercent }) => (
          <ProductCard
            key={product.id}
            product={product}
            badge={badge}
            badgeColor={badgeColor}
            promotionId={promotionId}
            promotionName={promotionName}
            originalPrice={originalPrice}
            discountPercent={discountPercent}
            displayMode="grid"
            featuredId={featuredId}
            featuredName={featuredName}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Área do carrossel com setas de navegação */}
      <div className="relative">
        {/* Seta esquerda */}
        <button
          onClick={handlePrev}
          aria-label="Página anterior"
          className="absolute -left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow-md transition-colors hover:bg-white sm:-left-3 sm:p-2"
          style={{ color: themeColor }}
        >
          <ChevronLeft size={18} />
        </button>

        {/* Container com overflow oculto — suporta arraste com mouse, trackpad e toque */}
        <div
          ref={trackRef}
          className="mx-6 overflow-hidden sm:mx-8"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseEnter={() => { setIsPaused(true); isPausedRef.current = true }}
          onMouseLeave={onMouseLeave}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        >
          <div
            className="flex"
            style={{
              transform: `translateX(${translateX}%)`,
              // Sem transição durante o arraste para acompanhar o dedo em tempo real
              transition: isDragging
                ? 'none'
                : `transform ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
              // Impede cliques nos cards apenas quando o arraste realmente se moveu
              userSelect: hasDragMoved ? 'none' : undefined,
              pointerEvents: hasDragMoved ? 'none' : undefined,
            }}
          >
            {/* Cada página ocupa 100% da largura visível */}
            {pages.map((pageProducts, pageIndex) => (
              <div
                key={pageIndex}
                className={`grid w-full shrink-0 ${colsClass} gap-2 sm:gap-3`}
              >
                {pageProducts.map(({ product, badge, badgeColor, promotionId, promotionName, originalPrice, discountPercent }) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    badge={badge}
                    badgeColor={badgeColor}
                    promotionId={promotionId}
                    promotionName={promotionName}
                    originalPrice={originalPrice}
                    discountPercent={discountPercent}
                    displayMode="grid"
                    featuredId={featuredId}
                    featuredName={featuredName}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Seta direita */}
        <button
          onClick={handleNext}
          aria-label="Próxima página"
          className="absolute -right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow-md transition-colors hover:bg-white sm:-right-3 sm:p-2"
          style={{ color: themeColor }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Indicadores de página (dots) */}
      <div className="flex items-center justify-center gap-1.5">
        {Array.from({ length: totalPages }).map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            aria-label={`Página ${index + 1}`}
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: index === currentPage ? 16 : 8,
              backgroundColor: index === currentPage ? themeColor : themeColor + '40',
            }}
          />
        ))}
      </div>
    </div>
  )
}
