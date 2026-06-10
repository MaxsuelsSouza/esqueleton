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

    return reply.send(updated)
  })
}
