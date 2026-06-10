'use client'

// Página de dashboard — visão geral da loja e métricas de produto
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Package, Tag, BadgePercent, Ticket, Sparkles, TrendingUp, ArrowRight,
  ShoppingBag, MessageCircle, BarChart3,
  ChevronDown, ChevronUp, Search, CheckCircle2, XCircle, Clock, Hash,
} from 'lucide-react'
import { catalogService } from '@/services/catalog.service'
import { categoriesService } from '@/services/categories.service'
import { promotionsService } from '@/services/promotions.service'
import { couponsService } from '@/services/coupons.service'
import { featuredService } from '@/services/featured.service'
import { analyticsService } from '@/services/analytics.service'
import { ordersService } from '@/services/orders.service'
import { getMockProducts } from '@/mocks/products-store'
import { getMockCategories } from '@/mocks/categories-store'
import { getMockPromotions } from '@/mocks/promotions-store'
import { getMockCoupons } from '@/mocks/coupons-store'
import { getMockFeatured } from '@/mocks/featured-store'
import type { Product, AnalyticsSummary, ProductMetric, Order } from '@esqueleton/shared'

// Troque para false quando a API estiver pronta
const USE_MOCK_DATA = false

type DashboardStats = {
  totalProducts: number
  totalCategories: number
  activePromotions: number
  activeCoupons: number
  activeFeatured: number
  recentProducts: Product[]
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true)

  // Estado da busca de pedidos
  const [orderSearch, setOrderSearch] = useState('')
  const [foundOrder, setFoundOrder] = useState<Order | null>(null)
  const [orderSearchError, setOrderSearchError] = useState<string | null>(null)
  const [isSearchingOrder, setIsSearchingOrder] = useState(false)
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false)

  useEffect(() => {
    loadStats()
    loadAnalytics()
  }, [])

  async function loadStats() {
    setIsLoadingStats(true)
    try {
      if (USE_MOCK_DATA) {
        const products = getMockProducts()
        const categories = getMockCategories()
        const promotions = getMockPromotions()
        const coupons = getMockCoupons()
        const featured = getMockFeatured()
        const now = new Date()

        setStats({
          totalProducts: products.length,
          totalCategories: categories.length,
          activePromotions: promotions.filter((p) => p.active).length,
          activeCoupons: coupons.filter((c) => {
            if (!c.active) return false
            if (c.maxUses !== undefined && c.usedCount >= c.maxUses) return false
            if (c.endDate && new Date(c.endDate) < now) return false
            return true
          }).length,
          activeFeatured: featured.filter((f) => f.active).length,
          recentProducts: products
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5),
        })
        return
      }

      const now = new Date()
      const [prodsPage, cats, promotions, coupons, featured] = await Promise.all([
        catalogService.listProducts({ pageSize: 500 }),
        categoriesService.listCategories(),
        promotionsService.listPromotions(),
        couponsService.listCoupons(),
        featuredService.listFeatured(),
      ])

      setStats({
        totalProducts: prodsPage.total,
        totalCategories: cats.length,
        activePromotions: promotions.filter((p) => p.active).length,
        activeCoupons: coupons.filter((c) => {
          if (!c.active) return false
          if (c.maxUses !== undefined && c.usedCount >= c.maxUses) return false
          if (c.endDate && new Date(c.endDate) < now) return false
          return true
        }).length,
        activeFeatured: featured.filter((f) => f.active).length,
        recentProducts: prodsPage.data
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5),
      })
    } catch {
      setStats({
        totalProducts: 0,
        totalCategories: 0,
        activePromotions: 0,
        activeCoupons: 0,
        activeFeatured: 0,
        recentProducts: [],
      })
    } finally {
      setIsLoadingStats(false)
    }
  }

  async function loadAnalytics() {
    setIsLoadingAnalytics(true)
    try {
      const token = localStorage.getItem('admin_token') ?? ''
      const data = await analyticsService.getSummary(token)
      setAnalytics(data)
    } catch {
      // Se não houver dados ou API indisponível, mantém null — exibe estado vazio
    } finally {
      setIsLoadingAnalytics(false)
    }
  }

  async function searchOrder() {
    const num = orderSearch.trim()
    if (!num) return
    setIsSearchingOrder(true)
    setFoundOrder(null)
    setOrderSearchError(null)
    try {
      const token = localStorage.getItem('admin_token') ?? ''
      const order = await ordersService.searchByNumber(num, token)
      setFoundOrder(order)
    } catch (err: unknown) {
      setOrderSearchError(err instanceof Error ? err.message : 'Pedido não encontrado.')
    } finally {
      setIsSearchingOrder(false)
    }
  }

  async function updateOrderStatus(status: 'SOLD' | 'NOT_SOLD') {
    if (!foundOrder) return
    setIsUpdatingOrder(true)
    try {
      const token = localStorage.getItem('admin_token') ?? ''
      const updated = await ordersService.updateStatus(foundOrder.orderNumber, status, token)
      setFoundOrder(updated)
      // Recarrega analytics para refletir a nova conversão
      loadAnalytics()
    } catch {
      // silencioso
    } finally {
      setIsUpdatingOrder(false)
    }
  }

  const hasAnalyticsData = analytics && analytics.totalCartAdds > 0

  return (
    <div className="flex flex-col gap-6">

      {/* Cabeçalho da página */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-500">Visão geral da sua loja</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Produtos" value={stats?.totalProducts} icon={Package} href="/admin/produtos" isLoading={isLoadingStats} />
        <StatCard label="Categorias" value={stats?.totalCategories} icon={Tag} href="/admin/categorias" isLoading={isLoadingStats} />
        <StatCard label="Promoções ativas" value={stats?.activePromotions} icon={BadgePercent} href="/admin/promocoes" isLoading={isLoadingStats} highlight />
        <StatCard label="Cupons ativos" value={stats?.activeCoupons} icon={Ticket} href="/admin/cupons" isLoading={isLoadingStats} highlight />
        <StatCard label="Destaques ativos" value={stats?.activeFeatured} icon={Sparkles} href="/admin/destaques" isLoading={isLoadingStats} highlight />
      </div>

      {/* ── Confirmar Pedidos ────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Hash size={16} className="text-gray-400" />
        <h2 className="text-base font-bold text-gray-700">Confirmar pedido</h2>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <p className="mb-3 text-sm text-gray-500">
          Digite o número do pedido que está na mensagem do WhatsApp para confirmar se a venda aconteceu.
        </p>

        {/* Barra de busca */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && searchOrder()}
              placeholder="Ex: 384729"
              maxLength={8}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-8 pr-4 text-sm font-mono text-gray-900 outline-none focus:border-gray-900"
            />
          </div>
          <button
            onClick={searchOrder}
            disabled={!orderSearch.trim() || isSearchingOrder}
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-40"
          >
            <Search size={14} />
            {isSearchingOrder ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {/* Erro de busca */}
        {orderSearchError && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{orderSearchError}</p>
        )}

        {/* Pedido encontrado */}
        {foundOrder && (
          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">

            {/* Cabeçalho do pedido */}
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold text-gray-900">#{foundOrder.orderNumber}</span>
                  <OrderStatusBadge status={foundOrder.status} />
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {new Date(foundOrder.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>

              {/* Dados do cliente */}
              {foundOrder.customerName && (
                <div className="text-right text-sm">
                  <p className="font-semibold text-gray-800">{foundOrder.customerName}</p>
                  {foundOrder.customerPhone && (
                    <p className="text-gray-500">{foundOrder.customerPhone}</p>
                  )}
                </div>
              )}
            </div>

            {/* Produtos */}
            <div className="mb-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
              {foundOrder.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    {item.promotionName && (
                      <p className="text-xs text-gray-400">🏷️ {item.promotionName}</p>
                    )}
                  </div>
                  <div className="ml-4 shrink-0 text-right text-sm">
                    <p className="text-gray-500">{item.quantity}× {item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <p className="font-semibold text-gray-900">{item.lineTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totais */}
            <div className="mb-4 flex flex-col gap-1 text-sm">
              {foundOrder.discount > 0 && (
                <>
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>{foundOrder.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>🎟️ Cupom {foundOrder.couponCode && <strong>{foundOrder.couponCode}</strong>}</span>
                    <span>-{foundOrder.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t pt-1 text-base font-bold text-gray-900">
                <span>Total</span>
                <span>{foundOrder.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </div>

            {/* Botões de confirmação — só aparecem se ainda estiver pendente */}
            {foundOrder.status === 'PENDING' && (
              <div className="flex gap-2">
                <button
                  onClick={() => updateOrderStatus('SOLD')}
                  disabled={isUpdatingOrder}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-500 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60"
                >
                  <CheckCircle2 size={15} />
                  Confirmar venda
                </button>
                <button
                  onClick={() => updateOrderStatus('NOT_SOLD')}
                  disabled={isUpdatingOrder}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-60"
                >
                  <XCircle size={15} />
                  Não vendido
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Seção de Analytics ───────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <BarChart3 size={16} className="text-gray-400" />
        <h2 className="text-base font-bold text-gray-700">Analytics de produtos</h2>
      </div>

      {isLoadingAnalytics ? (
        <AnalyticsSkeleton />
      ) : !hasAnalyticsData ? (
        <AnalyticsEmpty />
      ) : (
        <>
          {/* Cards de métricas globais */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard
              label="Adicionados à sacola"
              value={analytics.totalCartAdds}
              icon={ShoppingBag}
              color="blue"
            />
            <MetricCard
              label="Pedidos enviados"
              value={analytics.totalOrders}
              icon={MessageCircle}
              color="green"
              subtitle={`${analytics.totalWhatsappSends} itens`}
            />
            <MetricCard
              label="Links copiados"
              value={analytics.totalLinkCopies}
              icon={Hash}
              color="blue"
            />
            <MetricCard
              label="Vendas confirmadas"
              value={analytics.totalSoldOrders}
              icon={CheckCircle2}
              color="purple"
              subtitle={`${analytics.overallConversionRate}% de conversão`}
            />
            <MetricCard
              label="Aguardando confirmação"
              value={analytics.totalPendingOrders}
              icon={Clock}
              color="orange"
              subtitle="pendentes"
            />
          </div>

          {/* Funil de produtos */}
          <ProductFunnelSection analytics={analytics} />

          {/* Com cupom vs sem cupom / Com promoção vs preço original */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ComparisonCard
              title="Com cupom vs Sem cupom"
              labelA="Com cupom"
              labelB="Sem cupom"
              dataA={analytics.withCoupon}
              dataB={analytics.withoutCoupon}
            />
            <ComparisonCard
              title="Em promoção vs Preço original"
              labelA="Em promoção"
              labelB="Preço original"
              dataA={analytics.inPromotion}
              dataB={analytics.originalPrice}
            />
          </div>

          {/* Produtos com métricas de promoção */}
          {analytics.topProducts.some((p) => p.promotions.length > 0) && (
            <PromotionBreakdown products={analytics.topProducts} />
          )}
        </>
      )}

      {/* Produtos recentes */}
      <div className="rounded-2xl border border-gray-100 bg-white">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Produtos recentes</h2>
          </div>
          <Link href="/admin/produtos" className="flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-gray-700">
            Ver todos <ArrowRight size={12} />
          </Link>
        </div>

        {isLoadingStats ? (
          <div className="flex flex-col divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-100" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : stats?.recentProducts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Nenhum produto cadastrado ainda.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {stats?.recentProducts.map((product) => (
              <li key={product.id} className="flex items-center gap-3 px-5 py-3">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300">
                      <Package size={14} strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {product.brand && (
                    <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">{product.brand}</p>
                  )}
                  <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
                </div>
                <p className="shrink-0 text-sm text-gray-600">
                  {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Atalhos rápidos */}
      <div className="rounded-2xl border border-gray-100 bg-white">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-700">Acesso rápido</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
          {[
            { href: '/admin/produtos', label: 'Gerenciar produtos', icon: Package },
            { href: '/admin/categorias', label: 'Gerenciar categorias', icon: Tag },
            { href: '/admin/destaques', label: 'Gerenciar destaques', icon: Sparkles },
            { href: '/admin/promocoes', label: 'Gerenciar promoções', icon: BadgePercent },
            { href: '/admin/cupons', label: 'Gerenciar cupons', icon: Ticket },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900"
            >
              <Icon size={16} className="shrink-0 text-gray-400" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Componentes de analytics ────────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
    </div>
  )
}

function AnalyticsEmpty() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center">
      <BarChart3 size={32} strokeWidth={1.5} className="text-gray-300" />
      <p className="text-sm font-medium text-gray-500">Nenhum evento registrado ainda</p>
      <p className="text-xs text-gray-400">
        Os dados aparecem aqui conforme os clientes adicionam produtos à sacola e enviam pedidos pelo WhatsApp.
      </p>
    </div>
  )
}

const metricColors = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  color: keyof typeof metricColors
  subtitle?: string
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${metricColors[color]}`}>
        <Icon size={15} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <div>
        <p className="text-xs font-medium text-gray-700">{label}</p>
        {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
      </div>
    </div>
  )
}

// Classifica onde o produto está no funil de vendas
function getProductStatus(p: ProductMetric): 'confirmado' | 'aguardando' | 'whatsapp' | 'sacola' | 'link' {
  if (p.confirmedSales > 0) return 'confirmado'
  if (p.pendingOrders > 0) return 'aguardando'
  if (p.whatsappSends > 0) return 'whatsapp'
  if (p.cartAdds > 0) return 'sacola'
  return 'link'
}

const STATUS_CONFIG = {
  confirmado: { label: 'Venda confirmada', color: 'bg-green-100 text-green-700' },
  aguardando:  { label: 'Aguardando',       color: 'bg-yellow-100 text-yellow-700' },
  whatsapp:    { label: 'No WhatsApp',       color: 'bg-blue-100 text-blue-700' },
  sacola:      { label: 'Só na sacola',      color: 'bg-orange-100 text-orange-700' },
  link:        { label: 'Só link copiado',   color: 'bg-gray-100 text-gray-500' },
}

type FunnelTab = 'todos' | 'confirmado' | 'aguardando' | 'whatsapp' | 'sacola' | 'link'

function ProductFunnelSection({ analytics }: { analytics: AnalyticsSummary }) {
  const [activeTab, setActiveTab] = useState<FunnelTab>('todos')
  const [showAll, setShowAll] = useState(false)

  // Consolida todas as listas em uma única, sem duplicatas, ordenada por pontos
  const allProductsMap = new Map<string, ProductMetric>()
  for (const p of [
    ...analytics.topProducts,
    ...analytics.bottomProducts,
    ...analytics.cartOnlyProducts,
    ...analytics.convertedProducts,
  ]) {
    allProductsMap.set(p.productId, p)
  }
  const allProducts = Array.from(allProductsMap.values()).sort((a, b) => b.totalPoints - a.totalPoints)

  const byStatus = (tab: FunnelTab) => {
    if (tab === 'todos') return allProducts
    return allProducts.filter((p) => getProductStatus(p) === tab)
  }

  const tabs: { key: FunnelTab; label: string }[] = [
    { key: 'todos',      label: `Todos (${allProducts.length})` },
    { key: 'confirmado', label: `Vendidos (${byStatus('confirmado').length})` },
    { key: 'aguardando', label: `Aguardando (${byStatus('aguardando').length})` },
    { key: 'whatsapp',   label: `No WhatsApp (${byStatus('whatsapp').length})` },
    { key: 'sacola',     label: `Só sacola (${byStatus('sacola').length})` },
    { key: 'link',       label: `Só link (${byStatus('link').length})` },
  ]

  const filtered = byStatus(activeTab)
  const displayed = showAll ? filtered : filtered.slice(0, 10)

  return (
    <div className="rounded-2xl border border-gray-100 bg-white">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 border-b px-5 py-4">
        <BarChart3 size={15} className="text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-700">Funil de produtos</h3>
        <span className="ml-auto text-[11px] text-gray-400">Sacola → WhatsApp → Venda confirmada</span>
      </div>

      {/* Abas de filtro */}
      <div className="flex gap-1 overflow-x-auto border-b px-4 py-2 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setShowAll(false) }}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-400">Nenhum produto nessa categoria ainda.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-3">Produto</th>
                  {/* Funil: as três etapas lado a lado */}
                  <th className="px-3 py-3 text-center">Sacola</th>
                  <th className="px-3 py-3 text-center">WhatsApp</th>
                  <th className="px-3 py-3 text-center">Vendas</th>
                  <th className="px-3 py-3 text-center">Aguard.</th>
                  <th className="px-3 py-3 text-center">Cópias</th>
                  <th className="px-3 py-3 text-center">Conversão</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map((p, i) => {
                  const status = getProductStatus(p)
                  const cfg = STATUS_CONFIG[status]
                  // Barra de funil: percentual de cada etapa em relação à sacola
                  const whatsappPct = p.cartAdds > 0 ? Math.round((p.whatsappSends / p.cartAdds) * 100) : 0
                  const salesPct   = p.cartAdds > 0 ? Math.round((p.confirmedSales / p.cartAdds) * 100) : 0

                  return (
                    <tr key={p.productId} className="group hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-gray-300">#{i + 1}</span>
                            <span className="font-medium text-gray-800">{p.productName}</span>
                          </div>
                          {/* Mini barra de funil: sacola (base cinza) → WhatsApp (azul) → vendas (verde) */}
                          <div className="relative h-1.5 w-32 overflow-hidden rounded-full bg-gray-200">
                            <div className="absolute inset-y-0 left-0 rounded-full bg-blue-400 transition-all" style={{ width: `${whatsappPct}%` }} />
                            <div className="absolute inset-y-0 left-0 rounded-full bg-green-500 transition-all" style={{ width: `${salesPct}%` }} />
                          </div>
                        </div>
                      </td>
                      {/* Sacola */}
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block text-sm font-semibold ${p.cartAdds > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                          {p.cartAdds}
                        </span>
                      </td>
                      {/* WhatsApp */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-sm font-semibold ${p.whatsappSends > 0 ? 'text-blue-500' : 'text-gray-300'}`}>
                            {p.whatsappSends}
                          </span>
                          {p.cartAdds > 0 && (
                            <span className="text-[10px] text-gray-400">{whatsappPct}%</span>
                          )}
                        </div>
                      </td>
                      {/* Vendas confirmadas */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-sm font-bold ${p.confirmedSales > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                            {p.confirmedSales}
                          </span>
                          {p.cartAdds > 0 && p.confirmedSales > 0 && (
                            <span className="text-[10px] text-gray-400">{salesPct}%</span>
                          )}
                        </div>
                      </td>
                      {/* Aguardando */}
                      <td className="px-3 py-3 text-center">
                        <span className={`text-sm font-semibold ${p.pendingOrders > 0 ? 'text-yellow-600' : 'text-gray-300'}`}>
                          {p.pendingOrders}
                        </span>
                      </td>
                      {/* Cópias de link */}
                      <td className="px-3 py-3 text-center">
                        <span className={`text-sm ${p.linkCopies > 0 ? 'text-gray-600' : 'text-gray-300'}`}>
                          {p.linkCopies}
                        </span>
                      </td>
                      {/* Taxa de conversão */}
                      <td className="px-3 py-3 text-center">
                        <ConversionBadge rate={p.conversionRate} pending={p.pendingOrders} />
                      </td>
                      {/* Badge de status */}
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Legenda da barra de funil */}
          <div className="flex items-center gap-4 border-t px-5 py-2.5">
            <p className="text-[11px] text-gray-400 mr-1">Barra de funil:</p>
            <div className="flex items-center gap-1">
              <div className="h-2 w-3 rounded-sm bg-gray-200" />
              <span className="text-[11px] text-gray-400">Sacola</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-3 rounded-sm bg-blue-400" />
              <span className="text-[11px] text-gray-400">WhatsApp</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-3 rounded-sm bg-green-500" />
              <span className="text-[11px] text-gray-400">Venda confirmada</span>
            </div>
          </div>

          {filtered.length > 10 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="flex w-full items-center justify-center gap-1 border-t py-3 text-xs font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-700"
            >
              {showAll
                ? <><ChevronUp size={13} /> Ver menos</>
                : <><ChevronDown size={13} /> Ver todos ({filtered.length})</>
              }
            </button>
          )}
        </>
      )}
    </div>
  )
}

function ComparisonCard({
  title,
  labelA,
  labelB,
  dataA,
  dataB,
}: {
  title: string
  labelA: string
  labelB: string
  dataA: { cartAdds: number; whatsappSends: number }
  dataB: { cartAdds: number; whatsappSends: number }
}) {
  const totalA = dataA.cartAdds + dataA.whatsappSends
  const totalB = dataB.cartAdds + dataB.whatsappSends
  const total = totalA + totalB
  const pctA = total > 0 ? Math.round((totalA / total) * 100) : 0
  const pctB = total > 0 ? 100 - pctA : 0

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <p className="mb-4 text-sm font-semibold text-gray-700">{title}</p>

      {/* Barra de progresso comparativa */}
      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gray-800 transition-all"
          style={{ width: `${pctA}%` }}
        />
      </div>

      <div className="flex flex-col gap-3">
        <ComparisonRow label={labelA} pct={pctA} data={dataA} dark />
        <ComparisonRow label={labelB} pct={pctB} data={dataB} />
      </div>
    </div>
  )
}

function ComparisonRow({
  label,
  pct,
  data,
  dark = false,
}: {
  label: string
  pct: number
  data: { cartAdds: number; whatsappSends: number }
  dark?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${dark ? 'bg-gray-800' : 'bg-gray-200'}`} />
        <span className="text-gray-700">{label}</span>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span><span className="font-semibold text-gray-800">{data.cartAdds}</span> sacola</span>
        <span><span className="font-semibold text-gray-800">{data.whatsappSends}</span> WhatsApp</span>
        <span className="font-bold text-gray-900">{pct}%</span>
      </div>
    </div>
  )
}

function PromotionBreakdown({ products }: { products: ProductMetric[] }) {
  const withPromos = products.filter((p) => p.promotions.length > 0)
  if (withPromos.length === 0) return null

  return (
    <div className="rounded-2xl border border-gray-100 bg-white">
      <div className="border-b px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-700">Desempenho por promoção</h3>
        <p className="mt-0.5 text-xs text-gray-400">Pontuação de cada produto enquanto estava em uma promoção ativa</p>
      </div>
      <div className="divide-y divide-gray-50">
        {withPromos.map((p) => (
          <div key={p.productId} className="px-5 py-3">
            <p className="mb-2 text-sm font-medium text-gray-800">{p.productName}</p>
            <div className="flex flex-col gap-1">
              {p.promotions.map((promo) => (
                <div key={promo.promotionId} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{promo.promotionName}</span>
                  <div className="flex items-center gap-3 text-gray-600">
                    <span><span className="font-semibold">{promo.cartAdds}</span> sacola</span>
                    <span><span className="font-semibold">{promo.whatsappSends}</span> WhatsApp</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConversionBadge({ rate, pending }: { rate: number; pending?: number }) {
  if (rate === 0 && pending && pending > 0) {
    return (
      <span className="inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
        {pending} pend.
      </span>
    )
  }

  const color =
    rate >= 70 ? 'bg-green-100 text-green-700' :
    rate >= 40 ? 'bg-yellow-100 text-yellow-700' :
    rate > 0   ? 'bg-red-100 text-red-700' :
                 'bg-gray-100 text-gray-500'

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {rate}%
    </span>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  if (status === 'SOLD') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
      <CheckCircle2 size={11} /> Vendido
    </span>
  )
  if (status === 'NOT_SOLD') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600">
      <XCircle size={11} /> Não vendido
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">
      <Clock size={11} /> Pendente
    </span>
  )
}

// ── Componentes gerais ──────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, href, isLoading, highlight = false,
}: {
  label: string
  value: number | undefined
  icon: React.ElementType
  href: string
  isLoading: boolean
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 transition-colors hover:border-gray-200 hover:bg-gray-50"
    >
      <div className="flex items-center justify-between">
        <Icon size={16} className={highlight ? 'text-gray-500' : 'text-gray-400'} />
        <ArrowRight size={12} className="text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500" />
      </div>
      {isLoading ? (
        <div className="h-7 w-12 animate-pulse rounded bg-gray-100" />
      ) : (
        <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
      )}
      <p className="text-xs text-gray-500">{label}</p>
    </Link>
  )
}
