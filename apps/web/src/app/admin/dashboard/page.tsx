'use client'

// Página de dashboard — visão geral da loja e métricas de produto
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Package, Tag, BadgePercent, Ticket, Sparkles, TrendingUp, ArrowRight,
  ShoppingBag, MessageCircle, BarChart3,
  ChevronDown, ChevronUp, Search, CheckCircle2, XCircle, Clock, Hash,
  Eye, Heart, Star, RefreshCw, User,
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
import type { Product, AnalyticsSummary, ProductMetric, PromotionMetric, CouponMetric, FeaturedMetric, Order } from '@esqueleton/shared'

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
  const searchParams = useSearchParams()
  const orderSectionRef = useRef<HTMLDivElement>(null)

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true)

  // Aba ativa na seção de analytics
  const [analyticsTab, setAnalyticsTab] = useState<'produtos' | 'promocoes' | 'cupons' | 'destaques' | 'pedidos'>('produtos')

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

  // Quando vindo de uma notificação com ?pedido=XXXXXX, preenche e busca automaticamente
  useEffect(() => {
    const pedido = searchParams.get('pedido')
    if (!pedido) return
    setOrderSearch(pedido)
    // Pequeno delay para aguardar o estado ser aplicado antes de buscar
    setTimeout(() => {
      ordersService.searchByNumber(pedido, localStorage.getItem('admin_token') ?? '').then((order) => {
        setFoundOrder(order)
        // Rola a tela até a seção de confirmar pedido
        orderSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }).catch(() => {
        setOrderSearchError('Pedido não encontrado.')
      })
    }, 100)
  }, [searchParams])

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
      // Busca só os 5 mais recentes — o campo "total" da resposta já traz a contagem completa,
      // então não há motivo para carregar todos os produtos (e suas imagens) aqui
      const [prodsPage, cats, promotions, coupons, featured] = await Promise.all([
        catalogService.listProducts({ pageSize: 5 }, localStorage.getItem('admin_token') ?? ''),
        categoriesService.listCategories(localStorage.getItem('admin_token') ?? ''),
        promotionsService.listPromotions(localStorage.getItem('admin_token') ?? ''),
        couponsService.listCoupons(localStorage.getItem('admin_token') ?? ''),
        featuredService.listFeatured(localStorage.getItem('admin_token') ?? ''),
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
    } catch (err) {
      console.error('[dashboard] loadAnalytics falhou:', err)
      // Mantém analytics null — o painel exibirá estado vazio
    } finally {
      setIsLoadingAnalytics(false)
    }
  }

  async function clearFunnel() {
    if (!confirm('Tem certeza que deseja apagar todos os registros do funil? Esta ação não pode ser desfeita.')) return
    try {
      const token = localStorage.getItem('admin_token') ?? ''
      await analyticsService.clearEvents(token)
      setAnalytics(null)
    } catch {
      alert('Não foi possível limpar os registros do funil.')
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

  // Mostra analytics sempre que a resposta da API chegou, mesmo sem eventos de sacola
  const hasAnalyticsData = analytics !== null

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
      <div ref={orderSectionRef} className="flex items-center gap-2">
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
        <h2 className="text-base font-bold text-gray-700">Analytics</h2>
      </div>

      {isLoadingAnalytics ? (
        <AnalyticsSkeleton />
      ) : analytics === null ? (
        <AnalyticsError />
      ) : (
        <>
          {/* Cards de métricas globais */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <MetricCard label="Na sacola"         value={analytics.totalCartAdds}       icon={ShoppingBag}  color="blue" />
            <MetricCard label="Pedidos"            value={analytics.totalOrders}         icon={MessageCircle} color="green" />
            <MetricCard label="Vendidos"           value={analytics.totalSoldOrders}     icon={CheckCircle2} color="purple" subtitle={`${analytics.overallConversionRate}% conversão`} />
            <MetricCard label="Pendentes"          value={analytics.totalPendingOrders}  icon={Clock}        color="orange" />
            <MetricCard label="Links copiados"     value={analytics.totalLinkCopies}     icon={Hash}         color="blue" />
            <MetricCard label="Visualizações"      value={analytics.totalViews}          icon={Eye}          color="blue" />
            <MetricCard label="Favoritados"        value={analytics.totalFavorites}      icon={Heart}        color="purple" />
          </div>

          {/* Abas de navegação dos relatórios */}
          <div className="rounded-2xl border border-gray-100 bg-white">
            {/* Cabeçalho com abas */}
            <div className="flex overflow-x-auto border-b scrollbar-none">
              {([
                { key: 'produtos',   label: 'Produtos' },
                { key: 'promocoes',  label: 'Promoções' },
                { key: 'cupons',     label: 'Cupons' },
                { key: 'destaques',  label: 'Destaques' },
                { key: 'pedidos',    label: 'Pedidos' },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setAnalyticsTab(tab.key)}
                  className={`shrink-0 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
                    analyticsTab === tab.key
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Conteúdo da aba selecionada */}
            {analyticsTab === 'produtos' && (
              <ProductFunnelSection analytics={analytics} onClearFunnel={clearFunnel} />
            )}
            {analyticsTab === 'promocoes' && (
              <PromotionMetricsSection metrics={analytics.promotionMetrics ?? []} />
            )}
            {analyticsTab === 'cupons' && (
              <CouponMetricsSection metrics={analytics.couponMetrics ?? []} />
            )}
            {analyticsTab === 'destaques' && (
              <FeaturedMetricsSection metrics={analytics.featuredMetrics ?? []} />
            )}
            {analyticsTab === 'pedidos' && (
              <PedidosSection />
            )}
          </div>
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

function AnalyticsError() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-red-100 bg-white py-12 text-center">
      <BarChart3 size={32} strokeWidth={1.5} className="text-red-200" />
      <p className="text-sm font-medium text-gray-600">Não foi possível carregar os dados</p>
      <p className="text-xs text-gray-400">
        Verifique se a API está rodando e se você está autenticado. Abra o console para ver o erro.
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

// Saúde do produto: classificação simples para saber se está indo bem ou não
type ProductHealth = 'vendendo' | 'pendente' | 'parado' | 'interesse' | 'sem_dados'

function getProductHealth(p: ProductMetric): ProductHealth {
  if (p.confirmedSales > 0) return 'vendendo'
  if (p.pendingOrders > 0 || p.whatsappSends > 0) return 'pendente'
  if (p.cartAdds > 0) return 'parado'
  if ((p.views ?? 0) > 0 || p.linkCopies > 0 || (p.favorites ?? 0) > 0) return 'interesse'
  return 'sem_dados'
}

// O que dizer ao vendedor sobre cada situação
function getHealthInsight(p: ProductMetric, health: ProductHealth): string {
  if (health === 'vendendo') {
    return `${p.confirmedSales} venda${p.confirmedSales > 1 ? 's' : ''} confirmada${p.confirmedSales > 1 ? 's' : ''}${p.pendingOrders > 0 ? ` · ${p.pendingOrders} aguardando` : ''}`
  }
  if (health === 'pendente') {
    if (p.pendingOrders > 0) return `${p.pendingOrders} pedido${p.pendingOrders > 1 ? 's' : ''} aguardando confirmação`
    return `Foi ao WhatsApp ${p.whatsappSends}x mas nenhuma venda foi confirmada ainda`
  }
  if (health === 'parado') {
    return `Adicionado à sacola ${p.cartAdds}x mas nunca chegou ao WhatsApp`
  }
  if (health === 'interesse') {
    const parts: string[] = []
    if ((p.views ?? 0) > 0) parts.push(`${p.views} visualizações`)
    if (p.linkCopies > 0) parts.push(`${p.linkCopies} links copiados`)
    if ((p.favorites ?? 0) > 0) parts.push(`${p.favorites} favoritos`)
    return `Tem interesse (${parts.join(', ')}) mas nunca foi à sacola`
  }
  return 'Nenhum dado registrado ainda'
}

const HEALTH_CONFIG: Record<ProductHealth, { label: string; dot: string; card: string; badge: string }> = {
  vendendo:  { label: 'Vendendo',          dot: 'bg-green-500',  card: 'border-green-100',  badge: 'bg-green-100 text-green-700' },
  pendente:  { label: 'Aguardando',        dot: 'bg-yellow-400', card: 'border-yellow-100', badge: 'bg-yellow-100 text-yellow-700' },
  parado:    { label: 'Parado na sacola',  dot: 'bg-orange-400', card: 'border-orange-100', badge: 'bg-orange-100 text-orange-700' },
  interesse: { label: 'Só interesse',      dot: 'bg-blue-300',   card: 'border-blue-50',    badge: 'bg-blue-50 text-blue-500' },
  sem_dados: { label: 'Sem dados',         dot: 'bg-gray-200',   card: 'border-gray-100',   badge: 'bg-gray-100 text-gray-400' },
}

type ProductFilter = 'todos' | 'vendendo' | 'pendente' | 'parado' | 'interesse'

function ProductFunnelSection({ analytics, onClearFunnel }: { analytics: AnalyticsSummary; onClearFunnel: () => void }) {
  const [activeFilter, setActiveFilter] = useState<ProductFilter>('todos')
  const [showAll, setShowAll] = useState(false)

  // Consolida todas as listas em uma única, sem duplicatas
  const allProductsMap = new Map<string, ProductMetric>()
  for (const p of [
    ...analytics.topProducts,
    ...analytics.bottomProducts,
    ...analytics.cartOnlyProducts,
    ...analytics.convertedProducts,
    ...(analytics.mostViewedProducts ?? []),
    ...(analytics.mostFavoritedProducts ?? []),
  ]) {
    allProductsMap.set(p.productId, p)
  }
  const allProducts = Array.from(allProductsMap.values()).sort((a, b) => b.totalPoints - a.totalPoints)

  const countBy = (h: ProductHealth) => allProducts.filter((p) => getProductHealth(p) === h).length

  const filters: { key: ProductFilter; label: string; count: number; dot: string }[] = [
    { key: 'todos',     label: 'Todos',           count: allProducts.length,    dot: 'bg-gray-400' },
    { key: 'vendendo',  label: 'Vendendo',         count: countBy('vendendo'),   dot: 'bg-green-500' },
    { key: 'pendente',  label: 'Aguardando',       count: countBy('pendente'),   dot: 'bg-yellow-400' },
    { key: 'parado',    label: 'Parado na sacola', count: countBy('parado'),     dot: 'bg-orange-400' },
    { key: 'interesse', label: 'Só interesse',     count: countBy('interesse'),  dot: 'bg-blue-300' },
  ]

  const filtered = activeFilter === 'todos'
    ? allProducts
    : allProducts.filter((p) => getProductHealth(p) === activeFilter)
  const displayed = showAll ? filtered : filtered.slice(0, 12)

  return (
    <>
      {/* Filtros de saúde */}
      <div className="flex items-center gap-2 overflow-x-auto border-b px-4 py-3 scrollbar-none">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => { setActiveFilter(f.key); setShowAll(false) }}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === f.key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${activeFilter === f.key ? 'bg-white opacity-70' : f.dot}`} />
            {f.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeFilter === f.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {f.count}
            </span>
          </button>
        ))}
        <button
          onClick={onClearFunnel}
          className="ml-auto shrink-0 text-xs text-red-400 hover:text-red-600"
        >
          Limpar dados
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-gray-400">Nenhum produto nessa situação ainda.</p>
      ) : (
        <>
          {/* Grade de cartões */}
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayed.map((p) => {
              const health = getProductHealth(p)
              const cfg = HEALTH_CONFIG[health]
              const insight = getHealthInsight(p, health)
              const whatsappPct = p.cartAdds > 0 ? Math.round((p.whatsappSends / p.cartAdds) * 100) : 0
              const salesPct   = p.whatsappSends > 0 ? Math.round((p.confirmedSales / p.whatsappSends) * 100) : 0

              return (
                <div key={p.productId} className={`flex flex-col gap-3 rounded-xl border bg-white p-4 ${cfg.card}`}>

                  {/* Cabeçalho: nome + badge de saúde */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug text-gray-900">{p.productName}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.badge}`}>
                      <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Frase de diagnóstico */}
                  <p className="text-xs leading-relaxed text-gray-500">{insight}</p>

                  {/* Funil visual: etapas em linha */}
                  <div className="flex items-center gap-1 text-xs">
                    <FunnelStep value={p.views ?? 0}       label="Views"     active={(p.views ?? 0) > 0}    color="text-gray-400" />
                    <FunnelArrow />
                    <FunnelStep value={p.cartAdds}          label="Sacola"    active={p.cartAdds > 0}         color="text-blue-500" />
                    <FunnelArrow />
                    <FunnelStep value={p.whatsappSends}     label="WhatsApp"  active={p.whatsappSends > 0}    color="text-green-500" />
                    <FunnelArrow />
                    <FunnelStep value={p.confirmedSales}    label="Vendas"    active={p.confirmedSales > 0}   color="text-emerald-600" bold />
                  </div>

                  {/* Taxa de conversão — só quando há dados relevantes */}
                  {p.whatsappSends > 0 && (
                    <div className="flex items-center justify-between border-t pt-2 text-[11px] text-gray-400">
                      <span>Sacola → WhatsApp: <strong className="text-gray-600">{whatsappPct}%</strong></span>
                      {p.whatsappSends > 0 && <span>WhatsApp → Venda: <strong className={salesPct > 0 ? 'text-green-600' : 'text-gray-400'}>{salesPct}%</strong></span>}
                    </div>
                  )}

                  {/* Aviso de pedidos pendentes */}
                  {p.pendingOrders > 0 && p.confirmedSales === 0 && (
                    <div className="rounded-lg bg-yellow-50 px-3 py-2 text-[11px] font-medium text-yellow-700">
                      {p.pendingOrders} pedido{p.pendingOrders > 1 ? 's' : ''} aguardando confirmação no dashboard
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {filtered.length > 12 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="flex w-full items-center justify-center gap-1 border-t py-3 text-xs font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-700"
            >
              {showAll ? <><ChevronUp size={13} /> Ver menos</> : <><ChevronDown size={13} /> Ver todos ({filtered.length})</>}
            </button>
          )}
        </>
      )}
    </>
  )
}

// Etapa individual do funil dentro do cartão
function FunnelStep({ value, label, active, color, bold }: {
  value: number; label: string; active: boolean; color: string; bold?: boolean
}) {
  return (
    <div className={`flex flex-col items-center ${active ? color : 'text-gray-300'}`}>
      <span className={`text-sm ${bold ? 'font-bold' : 'font-semibold'}`}>{value}</span>
      <span className="text-[10px]">{label}</span>
    </div>
  )
}

function FunnelArrow() {
  return <span className="mx-1 text-gray-200">›</span>
}

// ── Seção de métricas por promoção ─────────────────────────────────────────

function PromotionMetricsSection({ metrics }: { metrics: PromotionMetric[] }) {
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? metrics : metrics.slice(0, 10)

  if (metrics.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
        <Star size={28} strokeWidth={1.5} className="text-gray-300" />
        <p className="text-sm font-medium text-gray-500">Nenhuma promoção ativou eventos ainda</p>
        <p className="text-xs text-gray-400">Os dados aparecem quando clientes adicionam à sacola produtos em promoção.</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              <th className="px-5 py-3">Promoção</th>
              <th className="px-3 py-3 text-center">Sacola</th>
              <th className="px-3 py-3 text-center">WhatsApp</th>
              <th className="px-3 py-3 text-center">Vendas</th>
              <th className="px-4 py-3 text-right">Conversão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {displayed.map((pm, i) => (
              <tr key={pm.promotionId} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-300">#{i + 1}</span>
                    <span className="font-medium text-gray-800">{pm.promotionName}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`text-sm font-semibold ${pm.cartAdds > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{pm.cartAdds}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`text-sm font-semibold ${pm.whatsappSends > 0 ? 'text-blue-500' : 'text-gray-300'}`}>{pm.whatsappSends}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`text-sm font-bold ${pm.confirmedSales > 0 ? 'text-green-600' : 'text-gray-300'}`}>{pm.confirmedSales}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <ConversionBadge rate={pm.conversionRate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {metrics.length > 10 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="flex w-full items-center justify-center gap-1 border-t py-3 text-xs font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-700"
        >
          {showAll ? <><ChevronUp size={13} /> Ver menos</> : <><ChevronDown size={13} /> Ver todas ({metrics.length})</>}
        </button>
      )}
    </>
  )
}

// ── Seção de métricas por cupom ─────────────────────────────────────────────

function CouponMetricsSection({ metrics }: { metrics: CouponMetric[] }) {
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? metrics : metrics.slice(0, 10)

  if (metrics.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
        <Ticket size={28} strokeWidth={1.5} className="text-gray-300" />
        <p className="text-sm font-medium text-gray-500">Nenhum cupom foi usado ainda</p>
        <p className="text-xs text-gray-400">Os dados aparecem quando pedidos com cupom são enviados pelo WhatsApp.</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              <th className="px-5 py-3">Código</th>
              <th className="px-3 py-3 text-center">Total pedidos</th>
              <th className="px-3 py-3 text-center">Vendidos</th>
              <th className="px-3 py-3 text-center">Pendentes</th>
              <th className="px-3 py-3 text-center">Não vendidos</th>
              <th className="px-4 py-3 text-right">Conversão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {displayed.map((cm, i) => (
              <tr key={cm.couponCode} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-300">#{i + 1}</span>
                    <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs font-semibold tracking-widest text-gray-700">
                      {cm.couponCode}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="text-sm font-semibold text-gray-700">{cm.totalOrders}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`text-sm font-bold ${cm.soldOrders > 0 ? 'text-green-600' : 'text-gray-300'}`}>{cm.soldOrders}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`text-sm font-semibold ${cm.pendingOrders > 0 ? 'text-yellow-600' : 'text-gray-300'}`}>{cm.pendingOrders}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`text-sm ${cm.notSoldOrders > 0 ? 'text-red-400' : 'text-gray-300'}`}>{cm.notSoldOrders}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <ConversionBadge rate={cm.conversionRate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {metrics.length > 10 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="flex w-full items-center justify-center gap-1 border-t py-3 text-xs font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-700"
        >
          {showAll ? <><ChevronUp size={13} /> Ver menos</> : <><ChevronDown size={13} /> Ver todos ({metrics.length})</>}
        </button>
      )}
    </>
  )
}

// ── Seção de métricas por destaque ──────────────────────────────────────────

function FeaturedMetricsSection({ metrics }: { metrics: FeaturedMetric[] }) {
  if (metrics.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
        <Sparkles size={28} strokeWidth={1.5} className="text-gray-300" />
        <p className="text-sm font-medium text-gray-500">Nenhum destaque gerou eventos ainda</p>
        <p className="text-xs text-gray-400">
          Os dados aparecem quando clientes clicam em produtos dentro de uma seção em destaque.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            <th className="px-5 py-3">Destaque</th>
            <th className="px-3 py-3 text-center">Cliques</th>
            <th className="px-3 py-3 text-center">Sacola</th>
            <th className="px-4 py-3 text-center">WhatsApp</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {metrics.map((fm, i) => (
            <tr key={fm.featuredId} className="hover:bg-gray-50">
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-300">#{i + 1}</span>
                  <span className="font-medium text-gray-800">{fm.featuredName}</span>
                </div>
              </td>
              <td className="px-3 py-3 text-center">
                <span className={`text-sm font-semibold ${fm.clicks > 0 ? 'text-blue-500' : 'text-gray-300'}`}>{fm.clicks}</span>
              </td>
              <td className="px-3 py-3 text-center">
                <span className={`text-sm font-semibold ${fm.cartAdds > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{fm.cartAdds}</span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`text-sm font-semibold ${fm.whatsappSends > 0 ? 'text-green-600' : 'text-gray-300'}`}>{fm.whatsappSends}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

// ── Aba de Pedidos ──────────────────────────────────────────────────────────

type OrderStatusFilter = 'todos' | 'PENDING' | 'SOLD' | 'NOT_SOLD'
type PeriodGroup = { label: string; orders: Order[] }

// Classifica cada pedido no período correto com base na data de criação
function groupByPeriod(orders: Order[]): PeriodGroup[] {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek  = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000) // últimos 7 dias
  const startOfMonth = new Date(startOfToday.getTime() - 29 * 24 * 60 * 60 * 1000) // últimos 30 dias

  const hoje:    Order[] = []
  const semana:  Order[] = []
  const mes:     Order[] = []
  const antigos: Order[] = []

  for (const order of orders) {
    const created = new Date(order.createdAt)
    if (created >= startOfToday)  hoje.push(order)
    else if (created >= startOfWeek) semana.push(order)
    else if (created >= startOfMonth) mes.push(order)
    else antigos.push(order)
  }

  return [
    { label: 'Hoje',           orders: hoje },
    { label: 'Últimos 7 dias', orders: semana },
    { label: 'Últimos 30 dias', orders: mes },
    { label: 'Mais antigos',   orders: antigos },
  ].filter((g) => g.orders.length > 0)
}

function PedidosSection() {
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('todos')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('admin_token') ?? ''
    ordersService.listAll(token)
      .then(setAllOrders)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  async function handleUpdateStatus(orderNumber: string, status: 'SOLD' | 'NOT_SOLD') {
    setUpdatingId(orderNumber)
    try {
      const token = localStorage.getItem('admin_token') ?? ''
      const updated = await ordersService.updateStatus(orderNumber, status, token)
      setAllOrders((prev) => prev.map((o) => o.orderNumber === orderNumber ? updated : o))
    } catch {
      // silencioso
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = statusFilter === 'todos'
    ? allOrders
    : allOrders.filter((o) => o.status === statusFilter)

  const groups = groupByPeriod(filtered)

  const counts = {
    todos:    allOrders.length,
    PENDING:  allOrders.filter((o) => o.status === 'PENDING').length,
    SOLD:     allOrders.filter((o) => o.status === 'SOLD').length,
    NOT_SOLD: allOrders.filter((o) => o.status === 'NOT_SOLD').length,
  }

  const filterButtons: { key: OrderStatusFilter; label: string; color: string }[] = [
    { key: 'todos',    label: 'Todos',        color: 'bg-gray-900 text-white' },
    { key: 'PENDING',  label: 'Pendentes',    color: 'bg-yellow-400 text-white' },
    { key: 'SOLD',     label: 'Vendidos',     color: 'bg-green-500 text-white' },
    { key: 'NOT_SOLD', label: 'Não vendidos', color: 'bg-red-400 text-white' },
  ]

  return (
    <>
      {/* Filtros por status */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setStatusFilter(btn.key)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === btn.key
                ? btn.color
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {btn.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              statusFilter === btn.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {counts[btn.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex flex-col divide-y px-4 py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <MessageCircle size={32} strokeWidth={1.5} className="text-gray-200" />
          <p className="text-sm font-medium text-gray-500">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {groups.map((group) => (
            <div key={group.label}>
              {/* Cabeçalho do período */}
              <div className="flex items-center gap-2 bg-gray-50 px-5 py-2">
                <Clock size={12} className="text-gray-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  {group.label}
                </span>
                <span className="text-[11px] text-gray-400">· {group.orders.length} pedido{group.orders.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Lista de pedidos do período */}
              <ul className="divide-y divide-gray-50">
                {group.orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    isUpdating={updatingId === order.orderNumber}
                    onUpdateStatus={handleUpdateStatus}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// Exibe o telefone do cliente com um popover para abrir o WhatsApp ao passar o mouse ou clicar
function PhonePopover({ phone }: { phone: string }) {
  const [open, setOpen] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const whatsappNumber = phone.replace(/\D/g, '')

  // Cancela qualquer fechamento agendado e mantém aberto
  function handleEnter() {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setOpen(true)
  }

  // Aguarda 200ms antes de fechar — tempo suficiente para o mouse atravessar o gap entre botão e popover
  function handleLeave() {
    hideTimer.current = setTimeout(() => setOpen(false), 200)
  }

  return (
    <span className="relative inline-flex items-center">

      {/* Overlay transparente que cobre a tela inteira — captura toque fora no mobile */}
      {open && (
        <span
          className="fixed inset-0 z-10"
          onClick={() => setOpen(false)}
        />
      )}

      <button
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onClick={() => setOpen(true)}
        className="relative z-20 ml-1 flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-green-700 transition-colors hover:bg-green-100"
      >
        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-green-500 shrink-0" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        {phone}
      </button>

      {open && (
        <span
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          className="absolute bottom-full left-0 z-20 w-max pb-1.5"
        >
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-xl border border-green-200 bg-white px-3 py-2 text-xs font-semibold text-green-700 shadow-md hover:bg-green-50"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-green-500" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Abrir no WhatsApp
          </a>
        </span>
      )}
    </span>
  )
}

function OrderRow({
  order,
  isUpdating,
  onUpdateStatus,
}: {
  order: Order
  isUpdating: boolean
  onUpdateStatus: (orderNumber: string, status: 'SOLD' | 'NOT_SOLD') => void
}) {
  const statusConfig = {
    PENDING:  { label: 'Pendente',     bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
    SOLD:     { label: 'Vendido',      bg: 'bg-green-100',  text: 'text-green-700',  icon: CheckCircle2 },
    NOT_SOLD: { label: 'Não vendido',  bg: 'bg-red-100',    text: 'text-red-600',    icon: XCircle },
  }
  const cfg = statusConfig[order.status as keyof typeof statusConfig] ?? statusConfig.PENDING
  const StatusIcon = cfg.icon

  // Formata data e hora do pedido
  const createdAt = new Date(order.createdAt)
  const dateLabel = createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const timeLabel = createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

      {/* Informações do pedido */}
      <div className="flex items-start gap-3">
        {/* Badge do status */}
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
          <StatusIcon size={16} className={cfg.text} />
        </div>

        <div className="min-w-0">
          {/* Número do pedido + data */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-gray-900">#{order.orderNumber}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
              {cfg.label}
            </span>
            <span className="text-xs text-gray-400">{dateLabel} às {timeLabel}</span>
          </div>

          {/* Cliente */}
          {order.customerName && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
              <User size={11} />
              <span>{order.customerName}</span>
              {order.customerPhone && (
                <PhonePopover phone={order.customerPhone} />
              )}
            </div>
          )}

          {/* Itens resumidos */}
          <p className="mt-0.5 truncate text-xs text-gray-400">
            {order.items.length} item{order.items.length !== 1 ? 'ns' : ''} ·{' '}
            {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            {order.discount > 0 && (
              <span className="ml-1 text-green-600">
                (-{order.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Botões de confirmação — só para pedidos pendentes */}
      {order.status === 'PENDING' && (
        <div className="flex shrink-0 gap-2 sm:ml-4">
          <button
            onClick={() => onUpdateStatus(order.orderNumber, 'SOLD')}
            disabled={isUpdating}
            className="flex items-center gap-1.5 rounded-xl bg-green-500 px-3 py-2 text-xs font-semibold text-white hover:bg-green-600 disabled:opacity-50"
          >
            {isUpdating ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            Confirmar
          </button>
          <button
            onClick={() => onUpdateStatus(order.orderNumber, 'NOT_SOLD')}
            disabled={isUpdating}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            <XCircle size={12} />
            Não vendido
          </button>
        </div>
      )}
    </li>
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
