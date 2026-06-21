'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { catalogService } from '@/modules/catalog/services/catalog.service'
import { categoriesService } from '@/modules/categories/services/categories.service'
import { promotionsService } from '@/modules/promotions/services/promotions.service'
import { couponsService } from '@/modules/coupons/services/coupons.service'
import { featuredService } from '@/modules/featured/services/featured.service'
import { analyticsService } from '@/modules/analytics/services/analytics.service'
import { ordersService } from '@/modules/orders/services/orders.service'
import { getMockProducts } from '@/modules/catalog/mocks/products-store'
import { getMockCategories } from '@/modules/categories/mocks/categories-store'
import { getMockPromotions } from '@/modules/promotions/mocks/promotions-store'
import { getMockCoupons } from '@/modules/coupons/mocks/coupons-store'
import { getMockFeatured } from '@/modules/featured/mocks/featured-store'
import type { Product, AnalyticsSummary, Order } from '@esqueleton/shared'

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

export function useDashboardPage() {
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
            if (c.maxUses != null && c.usedCount >= c.maxUses) return false
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
          if (c.maxUses != null && c.usedCount >= c.maxUses) return false
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

  return {
    orderSectionRef,
    stats,
    analytics,
    isLoadingStats,
    isLoadingAnalytics,
    analyticsTab,
    setAnalyticsTab,
    orderSearch,
    setOrderSearch,
    foundOrder,
    orderSearchError,
    isSearchingOrder,
    isUpdatingOrder,
    hasAnalyticsData,
    clearFunnel,
    searchOrder,
    updateOrderStatus,
  }
}
