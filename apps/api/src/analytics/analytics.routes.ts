// Rotas de analytics — registra eventos de produto e retorna métricas para o dashboard
import type { FastifyInstance } from 'fastify'
import { createEventSchema } from './analytics.schema'

export async function analyticsRoutes(app: FastifyInstance) {

  // POST /api/analytics/events — público, sem autenticação
  // Chamado pelo frontend sempre que um produto é visualizado, favoritado, adicionado à sacola ou enviado pelo WhatsApp
  // Limite por IP — impede que alguém infle as métricas com eventos falsos em massa
  app.post('/events', { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } }, async (request, reply) => {
    const data = createEventSchema.parse(request.body)
    await app.prisma.productEvent.create({ data })
    return reply.status(201).send({ message: 'Evento registrado.' })
  })

  // DELETE /api/analytics/events — protegido, apenas admins
  // Remove todos os eventos de produto, zerando o funil
  app.delete('/events', { preHandler: [app.authenticate] }, async (_request, reply) => {
    await app.prisma.productEvent.deleteMany()
    return reply.send({ message: 'Registros do funil apagados.' })
  })

  // GET /api/analytics/summary — protegido, apenas admins
  // Agrega todos os eventos e calcula as métricas completas do dashboard
  app.get('/summary', { preHandler: [app.authenticate] }, async (_request, reply) => {
    const [events, soldOrders, pendingOrders, allOrders] = await Promise.all([
      app.prisma.productEvent.findMany({ orderBy: { createdAt: 'asc' } }),
      app.prisma.order.findMany({ where: { status: 'SOLD' } }),
      app.prisma.order.findMany({ where: { status: 'PENDING' } }),
      app.prisma.order.findMany(),
    ])

    // ── Mapas de pedidos por produto ──────────────────────────────────────────

    // Conta vendas confirmadas por produto (cada item em pedido SOLD = 1 venda)
    const confirmedSalesMap = new Map<string, number>()
    for (const order of soldOrders) {
      const items = order.items as Array<{ productId: string }>
      for (const item of items) {
        confirmedSalesMap.set(item.productId, (confirmedSalesMap.get(item.productId) ?? 0) + 1)
      }
    }

    // Conta pedidos pendentes por produto
    const pendingOrdersMap = new Map<string, number>()
    for (const order of pendingOrders) {
      const items = order.items as Array<{ productId: string }>
      for (const item of items) {
        pendingOrdersMap.set(item.productId, (pendingOrdersMap.get(item.productId) ?? 0) + 1)
      }
    }

    // ── Totais globais ────────────────────────────────────────────────────────

    let totalCartAdds = 0
    let totalWhatsappSends = 0
    let totalLinkCopies = 0
    let totalViews = 0
    let totalFavorites = 0
    const withCoupon = { cartAdds: 0, whatsappSends: 0 }
    const withoutCoupon = { cartAdds: 0, whatsappSends: 0 }
    const inPromotion = { cartAdds: 0, whatsappSends: 0 }
    const originalPrice = { cartAdds: 0, whatsappSends: 0 }

    // ── Mapa de métricas por produto ─────────────────────────────────────────

    type ProductEntry = {
      productId: string
      productName: string
      cartAdds: number
      whatsappSends: number
      linkCopies: number
      views: number
      favorites: number
      withCoupon: { cartAdds: number; whatsappSends: number }
      withoutCoupon: { cartAdds: number; whatsappSends: number }
      promotionMap: Map<string, { promotionId: string; promotionName: string; cartAdds: number; whatsappSends: number }>
    }

    const productMap = new Map<string, ProductEntry>()

    // ── Mapa de métricas por promoção ────────────────────────────────────────

    type PromotionEntry = {
      promotionId: string
      promotionName: string
      cartAdds: number
      whatsappSends: number
    }
    const promotionMap = new Map<string, PromotionEntry>()

    // ── Mapa de métricas por destaque ────────────────────────────────────────

    type FeaturedEntry = {
      featuredId: string
      featuredName: string
      clicks: number
      cartAdds: number
      whatsappSends: number
    }
    const featuredMap = new Map<string, FeaturedEntry>()

    // ── Processa cada evento ─────────────────────────────────────────────────

    for (const event of events) {
      // Garante que o produto existe no mapa
      if (!productMap.has(event.productId)) {
        productMap.set(event.productId, {
          productId: event.productId,
          productName: event.productName,
          cartAdds: 0,
          whatsappSends: 0,
          linkCopies: 0,
          views: 0,
          favorites: 0,
          withCoupon: { cartAdds: 0, whatsappSends: 0 },
          withoutCoupon: { cartAdds: 0, whatsappSends: 0 },
          promotionMap: new Map(),
        })
      }

      const p = productMap.get(event.productId)!
      const isCart      = event.eventType === 'CART_ADD'
      const isWhatsApp  = event.eventType === 'WHATSAPP_SEND'
      const isCopy      = event.eventType === 'LINK_COPY'
      const isView      = event.eventType === 'PRODUCT_VIEW'
      const isFavorite  = event.eventType === 'FAVORITE_ADD'
      const isFeatured  = event.eventType === 'FEATURED_CLICK'

      // Contagem por tipo no produto
      if (isCart)     { p.cartAdds++;     totalCartAdds++ }
      if (isWhatsApp) { p.whatsappSends++; totalWhatsappSends++ }
      if (isCopy)     { p.linkCopies++;   totalLinkCopies++ }
      if (isView)     { p.views++;         totalViews++ }
      if (isFavorite) { p.favorites++;     totalFavorites++ }

      // Com ou sem cupom (relevante para sacola e WhatsApp)
      if (event.couponCode) {
        if (isCart)     { p.withCoupon.cartAdds++;     withCoupon.cartAdds++ }
        if (isWhatsApp) { p.withCoupon.whatsappSends++; withCoupon.whatsappSends++ }
      } else {
        if (isCart)     { p.withoutCoupon.cartAdds++;     withoutCoupon.cartAdds++ }
        if (isWhatsApp) { p.withoutCoupon.whatsappSends++; withoutCoupon.whatsappSends++ }
      }

      // Com promoção ou preço original
      if (event.promotionId && event.promotionName) {
        // Promoção no produto
        if (!p.promotionMap.has(event.promotionId)) {
          p.promotionMap.set(event.promotionId, {
            promotionId: event.promotionId,
            promotionName: event.promotionName,
            cartAdds: 0,
            whatsappSends: 0,
          })
        }
        const pm = p.promotionMap.get(event.promotionId)!
        if (isCart)     { pm.cartAdds++;     inPromotion.cartAdds++ }
        if (isWhatsApp) { pm.whatsappSends++; inPromotion.whatsappSends++ }

        // Promoção global (agrega todas as ativações da mesma promoção)
        if (!promotionMap.has(event.promotionId)) {
          promotionMap.set(event.promotionId, {
            promotionId: event.promotionId,
            promotionName: event.promotionName,
            cartAdds: 0,
            whatsappSends: 0,
          })
        }
        const gp = promotionMap.get(event.promotionId)!
        if (isCart)     gp.cartAdds++
        if (isWhatsApp) gp.whatsappSends++
      } else {
        if (isCart)     originalPrice.cartAdds++
        if (isWhatsApp) originalPrice.whatsappSends++
      }

      // Métricas por seção em destaque (FEATURED_CLICK e CART_ADD com featuredId)
      if (event.featuredId && event.featuredName) {
        if (!featuredMap.has(event.featuredId)) {
          featuredMap.set(event.featuredId, {
            featuredId: event.featuredId,
            featuredName: event.featuredName,
            clicks: 0,
            cartAdds: 0,
            whatsappSends: 0,
          })
        }
        const fe = featuredMap.get(event.featuredId)!
        if (isFeatured) fe.clicks++
        if (isCart)     fe.cartAdds++
        if (isWhatsApp) fe.whatsappSends++
      }
    }

    // ── Métricas de promoção — vendas confirmadas (via pedidos SOLD) ─────────

    // Conta vendas confirmadas por promoção (items dos pedidos SOLD têm promotionName)
    const promotionSalesMap = new Map<string, number>()
    for (const order of soldOrders) {
      const items = order.items as Array<{ promotionName?: string }>
      for (const item of items) {
        if (item.promotionName) {
          promotionSalesMap.set(item.promotionName, (promotionSalesMap.get(item.promotionName) ?? 0) + 1)
        }
      }
    }

    const promotionMetrics = Array.from(promotionMap.values()).map((pm) => {
      const confirmedSales = promotionSalesMap.get(pm.promotionName) ?? 0
      return {
        promotionId: pm.promotionId,
        promotionName: pm.promotionName,
        cartAdds: pm.cartAdds,
        whatsappSends: pm.whatsappSends,
        confirmedSales,
        conversionRate: pm.whatsappSends > 0
          ? Math.round((confirmedSales / pm.whatsappSends) * 100)
          : 0,
      }
    }).sort((a, b) => b.confirmedSales - a.confirmedSales)

    // ── Métricas de cupom — agrupadas por código ─────────────────────────────

    type CouponEntry = { totalOrders: number; soldOrders: number; pendingOrders: number; notSoldOrders: number }
    const couponOrderMap = new Map<string, CouponEntry>()

    for (const order of allOrders) {
      if (!order.couponCode) continue
      if (!couponOrderMap.has(order.couponCode)) {
        couponOrderMap.set(order.couponCode, { totalOrders: 0, soldOrders: 0, pendingOrders: 0, notSoldOrders: 0 })
      }
      const ce = couponOrderMap.get(order.couponCode)!
      ce.totalOrders++
      if (order.status === 'SOLD')     ce.soldOrders++
      if (order.status === 'PENDING')  ce.pendingOrders++
      if (order.status === 'NOT_SOLD') ce.notSoldOrders++
    }

    const couponMetrics = Array.from(couponOrderMap.entries()).map(([code, ce]) => ({
      couponCode: code,
      totalOrders: ce.totalOrders,
      soldOrders: ce.soldOrders,
      pendingOrders: ce.pendingOrders,
      notSoldOrders: ce.notSoldOrders,
      conversionRate: ce.totalOrders > 0
        ? Math.round((ce.soldOrders / ce.totalOrders) * 100)
        : 0,
    })).sort((a, b) => b.totalOrders - a.totalOrders)

    // ── Totais de pedidos ─────────────────────────────────────────────────────

    const totalOrders = allOrders.length
    const totalPendingOrders = pendingOrders.length
    const totalSoldOrders = soldOrders.length
    const totalNotSoldOrders = allOrders.filter((o) => o.status === 'NOT_SOLD').length

    // ── Converte produto map → lista com métricas calculadas ─────────────────

    const allProducts = Array.from(productMap.values()).map((p) => {
      const confirmedSales = confirmedSalesMap.get(p.productId) ?? 0
      const pendingCount   = pendingOrdersMap.get(p.productId) ?? 0
      return {
        productId: p.productId,
        productName: p.productName,
        cartAdds: p.cartAdds,
        whatsappSends: p.whatsappSends,
        linkCopies: p.linkCopies,
        views: p.views,
        favorites: p.favorites,
        confirmedSales,
        pendingOrders: pendingCount,
        totalPoints: p.cartAdds + p.whatsappSends,
        conversionRate: p.whatsappSends > 0
          ? Math.round((confirmedSales / p.whatsappSends) * 100)
          : 0,
        withCoupon: p.withCoupon,
        withoutCoupon: p.withoutCoupon,
        promotions: Array.from(p.promotionMap.values()),
      }
    })

    const sorted = [...allProducts].sort((a, b) => b.totalPoints - a.totalPoints)

    return reply.send({
      topProducts: sorted.slice(0, 10),
      bottomProducts: [...sorted].reverse().slice(0, 10),
      cartOnlyProducts: allProducts
        .filter((p) => p.cartAdds > 0 && p.whatsappSends === 0)
        .sort((a, b) => b.cartAdds - a.cartAdds),
      convertedProducts: allProducts
        .filter((p) => p.whatsappSends > 0)
        .sort((a, b) => b.whatsappSends - a.whatsappSends),
      mostViewedProducts: allProducts
        .filter((p) => p.views > 0)
        .sort((a, b) => b.views - a.views)
        .slice(0, 10),
      mostFavoritedProducts: allProducts
        .filter((p) => p.favorites > 0)
        .sort((a, b) => b.favorites - a.favorites)
        .slice(0, 10),
      totalCartAdds,
      totalWhatsappSends,
      totalLinkCopies,
      totalViews,
      totalFavorites,
      totalOrders,
      totalPendingOrders,
      totalSoldOrders,
      totalNotSoldOrders,
      overallConversionRate: totalWhatsappSends > 0
        ? Math.round((totalSoldOrders / totalWhatsappSends) * 100)
        : 0,
      withCoupon,
      withoutCoupon,
      inPromotion,
      originalPrice,
      promotionMetrics,
      couponMetrics,
      featuredMetrics: Array.from(featuredMap.values()).sort((a, b) => b.clicks - a.clicks),
    })
  })
}
