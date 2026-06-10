// Rotas de analytics — registra eventos de produto e retorna métricas para o dashboard
import type { FastifyInstance } from 'fastify'
import { createEventSchema } from './analytics.schema'

export async function analyticsRoutes(app: FastifyInstance) {

  // POST /api/analytics/events — público, sem autenticação
  // Chamado pelo frontend sempre que um produto é adicionado à sacola ou enviado pelo WhatsApp
  app.post('/events', async (request, reply) => {
    const data = createEventSchema.parse(request.body)

    await app.prisma.productEvent.create({ data })

    return reply.status(201).send({ message: 'Evento registrado.' })
  })

  // GET /api/analytics/summary — protegido, apenas admins
  // Agrega todos os eventos e calcula as métricas do dashboard
  app.get('/summary', { preHandler: [app.authenticate] }, async (_request, reply) => {
    const [events, soldOrders] = await Promise.all([
      app.prisma.productEvent.findMany({ orderBy: { createdAt: 'asc' } }),
      app.prisma.order.findMany({ where: { status: 'SOLD' } }),
    ])

    // Conta vendas confirmadas por produto (cada aparição em um pedido SOLD = 1 venda confirmada)
    const confirmedSalesMap = new Map<string, number>()
    for (const order of soldOrders) {
      const orderItems = order.items as Array<{ productId: string }>
      for (const item of orderItems) {
        confirmedSalesMap.set(item.productId, (confirmedSalesMap.get(item.productId) ?? 0) + 1)
      }
    }

    // Conta pedidos pendentes por produto
    const pendingOrders = await app.prisma.order.findMany({ where: { status: 'PENDING' } })
    const pendingOrdersMap = new Map<string, number>()
    for (const order of pendingOrders) {
      const orderItems = order.items as Array<{ productId: string }>
      for (const item of orderItems) {
        pendingOrdersMap.set(item.productId, (pendingOrdersMap.get(item.productId) ?? 0) + 1)
      }
    }

    // Totais globais
    let totalCartAdds = 0
    let totalWhatsappSends = 0
    let totalLinkCopies = 0
    const withCoupon = { cartAdds: 0, whatsappSends: 0 }
    const withoutCoupon = { cartAdds: 0, whatsappSends: 0 }
    const inPromotion = { cartAdds: 0, whatsappSends: 0 }
    const originalPrice = { cartAdds: 0, whatsappSends: 0 }

    // Mapa de métricas por produto
    type ProductEntry = {
      productId: string
      productName: string
      cartAdds: number
      whatsappSends: number
      linkCopies: number
      withCoupon: { cartAdds: number; whatsappSends: number }
      withoutCoupon: { cartAdds: number; whatsappSends: number }
      promotionMap: Map<string, { promotionId: string; promotionName: string; cartAdds: number; whatsappSends: number }>
    }

    const productMap = new Map<string, ProductEntry>()

    for (const event of events) {
      if (!productMap.has(event.productId)) {
        productMap.set(event.productId, {
          productId: event.productId,
          productName: event.productName,
          cartAdds: 0,
          whatsappSends: 0,
          linkCopies: 0,
          withCoupon: { cartAdds: 0, whatsappSends: 0 },
          withoutCoupon: { cartAdds: 0, whatsappSends: 0 },
          promotionMap: new Map(),
        })
      }

      const p = productMap.get(event.productId)!
      const isCart = event.eventType === 'CART_ADD'
      const isWhatsApp = event.eventType === 'WHATSAPP_SEND'
      const isCopy = event.eventType === 'LINK_COPY'

      // Contagem por tipo
      if (isCart)     { p.cartAdds++;     totalCartAdds++ }
      if (isWhatsApp) { p.whatsappSends++; totalWhatsappSends++ }
      if (isCopy)     { p.linkCopies++;   totalLinkCopies++ }

      // Com ou sem cupom
      if (event.couponCode) {
        if (isCart)     { p.withCoupon.cartAdds++;     withCoupon.cartAdds++ }
        if (isWhatsApp) { p.withCoupon.whatsappSends++; withCoupon.whatsappSends++ }
      } else {
        if (isCart)     { p.withoutCoupon.cartAdds++;     withoutCoupon.cartAdds++ }
        if (isWhatsApp) { p.withoutCoupon.whatsappSends++; withoutCoupon.whatsappSends++ }
      }

      // Com promoção ou preço original
      if (event.promotionId && event.promotionName) {
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
      } else {
        if (isCart)     originalPrice.cartAdds++
        if (isWhatsApp) originalPrice.whatsappSends++
      }
    }

    // Totais de pedidos
    const totalOrders = await app.prisma.order.count()
    const totalPendingOrders = await app.prisma.order.count({ where: { status: 'PENDING' } })
    const totalSoldOrders = soldOrders.length
    const totalNotSoldOrders = await app.prisma.order.count({ where: { status: 'NOT_SOLD' } })

    // Converte o mapa para uma lista com métricas calculadas
    const allProducts = Array.from(productMap.values()).map((p) => {
      const confirmedSales = confirmedSalesMap.get(p.productId) ?? 0
      const pendingCount = pendingOrdersMap.get(p.productId) ?? 0
      return {
        productId: p.productId,
        productName: p.productName,
        cartAdds: p.cartAdds,
        whatsappSends: p.whatsappSends,
        linkCopies: p.linkCopies,
        // Vendas confirmadas pelo conferente no dashboard
        confirmedSales,
        // Pedidos aguardando confirmação
        pendingOrders: pendingCount,
        totalPoints: p.cartAdds + p.whatsappSends + p.linkCopies,
        // Conversão real = vendas confirmadas / enviados ao WhatsApp × 100
        // Chega a 100% apenas quando o conferente confirma todos os pedidos como SOLD
        conversionRate: p.whatsappSends > 0
          ? Math.round((confirmedSales / p.whatsappSends) * 100)
          : 0,
        withCoupon: p.withCoupon,
        withoutCoupon: p.withoutCoupon,
        promotions: Array.from(p.promotionMap.values()),
      }
    })

    // Ordena por pontuação total (maior primeiro)
    const sorted = [...allProducts].sort((a, b) => b.totalPoints - a.totalPoints)

    return reply.send({
      // Top 10 produtos com mais pontos
      topProducts: sorted.slice(0, 10),
      // Bottom 10 produtos com menos pontos (excluindo os do top se a lista for pequena)
      bottomProducts: [...sorted].reverse().slice(0, 10),
      // Produtos que ficaram apenas na sacola, nunca foram ao WhatsApp
      cartOnlyProducts: allProducts
        .filter((p) => p.cartAdds > 0 && p.whatsappSends === 0)
        .sort((a, b) => b.cartAdds - a.cartAdds),
      // Produtos que chegaram até o WhatsApp
      convertedProducts: allProducts
        .filter((p) => p.whatsappSends > 0)
        .sort((a, b) => b.whatsappSends - a.whatsappSends),
      // Totais globais
      totalCartAdds,
      totalWhatsappSends,
      totalLinkCopies,
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
    })
  })
}
