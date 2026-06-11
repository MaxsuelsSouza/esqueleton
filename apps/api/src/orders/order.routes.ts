// Rotas de pedidos — criação pública e gestão pelo admin
import type { FastifyInstance } from 'fastify'
import { createOrderSchema, updateOrderStatusSchema } from './order.schema'

export async function orderRoutes(app: FastifyInstance) {

  // POST /api/orders — público, chamado quando o cliente clica em "Enviar pelo WhatsApp"
  app.post('/', async (request, reply) => {
    const data = createOrderSchema.parse(request.body)

    const order = await app.prisma.order.create({
      data: {
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        items: data.items,
        subtotal: data.subtotal,
        discount: data.discount,
        total: data.total,
        couponCode: data.couponCode,
        status: 'PENDING',
      },
    })

    // Cria notificação de novo pedido — fire and forget, nunca bloqueia a resposta
    app.prisma.notification.create({
      data: {
        type: 'NEW_ORDER',
        title: `Novo pedido #${order.orderNumber} recebido`,
        body: data.customerName ? `Cliente: ${data.customerName}` : undefined,
        entityId: order.orderNumber,
        // Dados estruturados para exibir telefone e total no card da notificação
        metadata: JSON.stringify({
          customerName: data.customerName ?? null,
          customerPhone: data.customerPhone ?? null,
          total: data.total,
        }),
      },
    }).catch(() => {}) // silencioso — o pedido não pode ser bloqueado por falha de notificação

    return reply.status(201).send(order)
  })

  // GET /api/orders/search?orderNumber=XXXXXX — protegido, busca pedido pelo número
  app.get('/search', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { orderNumber } = request.query as { orderNumber?: string }

    if (!orderNumber?.trim()) {
      return reply.status(400).send({ message: 'Informe o número do pedido.' })
    }

    const order = await app.prisma.order.findUnique({
      where: { orderNumber: orderNumber.trim() },
    })

    if (!order) {
      return reply.status(404).send({ message: 'Pedido não encontrado.' })
    }

    return reply.send(order)
  })

  // GET /api/orders — protegido, lista pedidos com filtro opcional de status
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { status } = request.query as { status?: string }

    const orders = await app.prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return reply.send(orders)
  })

  // PATCH /api/orders/:orderNumber/status — protegido, confirma ou rejeita um pedido
  app.patch('/:orderNumber/status', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { orderNumber } = request.params as { orderNumber: string }
    const { status } = updateOrderStatusSchema.parse(request.body)

    const order = await app.prisma.order.findUnique({ where: { orderNumber } })

    if (!order) {
      return reply.status(404).send({ message: 'Pedido não encontrado.' })
    }

    const updated = await app.prisma.order.update({
      where: { orderNumber },
      data: { status },
    })

    // Ao confirmar como VENDIDO, desconta o estoque de cada produto do pedido
    // Só executa se o pedido ainda não era SOLD — evita decrementar duas vezes
    if (status === 'SOLD' && order.status !== 'SOLD') {
      const items = order.items as Array<{ productId: string; quantity: number }>

      for (const item of items) {
        // Busca o produto para verificar se o estoque é controlado (stock !== null)
        const product = await app.prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, brand: true, stock: true },
        })

        // Pula produtos não encontrados ou com estoque não controlado
        if (!product || product.stock === null) continue

        const novoEstoque = Math.max(0, product.stock - item.quantity)

        await app.prisma.product.update({
          where: { id: product.id },
          data: { stock: novoEstoque },
        })

        // Notifica estoque baixo ou esgotado — fire and forget, igual ao que acontece ao editar produto
        const productName = product.brand ? `${product.brand} ${product.name}` : product.name
        if (novoEstoque === 0) {
          app.prisma.notification.upsert({
            where: { type_entityId: { type: 'OUT_OF_STOCK', entityId: product.id } },
            create: { type: 'OUT_OF_STOCK', title: `"${productName}" está sem estoque`, entityId: product.id },
            update: { status: 'PENDING', createdAt: new Date() },
          }).catch(() => {})
        } else if (novoEstoque < 3) {
          app.prisma.notification.upsert({
            where: { type_entityId: { type: 'LOW_STOCK', entityId: product.id } },
            create: { type: 'LOW_STOCK', title: `"${productName}" com estoque baixo`, body: `Restam ${novoEstoque} unidade${novoEstoque === 1 ? '' : 's'}`, entityId: product.id },
            update: { status: 'PENDING', body: `Restam ${novoEstoque} unidade${novoEstoque === 1 ? '' : 's'}`, createdAt: new Date() },
          }).catch(() => {})
        }
      }
    }

    return reply.send(updated)
  })
}
