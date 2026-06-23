// Rotas de pedidos — divididas em dois grupos:
//   - orderPublicRoutes: criação pelo cliente no checkout, a loja vem do slug na URL
//   - orderAdminRoutes: gestão pelo painel, a loja vem do token JWT
import type { FastifyInstance } from 'fastify'
import { createOrderSchema, updateOrderStatusSchema } from '../../schemas/order.schema'
import { validateOrderArithmetic, validateOrderPrices } from '../../../domain/order/services/order.service'
import { isCouponUsable } from '../../../domain/pricing/services/coupon.service'

// ── Rota pública — a loja vem do slug na URL ───────────────────────
export async function orderPublicRoutes(app: FastifyInstance) {

  // POST /api/lojas/:slug/orders — público, chamado quando o cliente clica em "Enviar pelo WhatsApp"
  // Limite por IP — impede que alguém crie pedidos falsos em massa.
  // checkPlanLimit — bloqueia quando a loja atingiu o teto de pedidos do mês no plano dela.
  app.post('/', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    preHandler: [app.checkPlanLimit('maxOrdersPerMonth')],
  }, async (request, reply) => {
    const storeId = request.store!.id
    const data = createOrderSchema.parse(request.body)

    // Confere a aritmética do pedido — impede totais manipulados por requisições
    // montadas fora do site (tolerância de 1 centavo para arredondamentos)
    if (!validateOrderArithmetic(data)) {
      return reply.status(400).send({ message: 'Os valores do pedido não conferem.' })
    }

    // Confere o preço de cada item contra o banco — impede que alguém altere
    // o unitPrice no request para pagar menos do que o produto realmente custa
    const productIds = [...new Set(data.items.map((item) => item.productId))]

    const [products, promotions, coupon] = await Promise.all([
      app.prisma.product.findMany({
        where: { id: { in: productIds }, storeId, isAvailable: true },
        include: {
          variants: { select: { id: true, price: true, active: true } },
        },
      }),
      app.prisma.promotion.findMany({
        where: { storeId, active: true },
        orderBy: { priority: 'asc' },
      }),
      data.couponCode
        ? app.prisma.coupon.findUnique({
            where: { storeId_code: { storeId, code: data.couponCode.toUpperCase() } },
          })
        : null,
    ])

    // Se o cupom foi informado mas não existe ou não pode ser usado, ignora-o na validação
    // (o incremento de usedCount no final também já é fire-and-forget)
    const couponValido = coupon && isCouponUsable(coupon).valid ? coupon : null

    const priceCheck = validateOrderPrices(data.items, products, promotions, couponValido)
    if (!priceCheck.valid) {
      return reply.status(400).send({ message: priceCheck.message })
    }

    const order = await app.prisma.order.create({
      data: {
        storeId,
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
        storeId,
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

    // Registra o uso do cupom no servidor — sem isso o limite de usos (maxUses)
    // nunca seria atingido, já que o navegador do cliente não tem permissão para isso
    if (data.couponCode) {
      app.prisma.coupon.updateMany({
        where: { storeId, code: data.couponCode.toUpperCase() },
        data: { usedCount: { increment: 1 } },
      }).catch(() => {}) // cupom inexistente não bloqueia o pedido
    }

    return reply.status(201).send(order)
  })
}

// ── Rotas do admin — a loja vem do token JWT ───────────────────────
export async function orderAdminRoutes(app: FastifyInstance) {
  // Todas as rotas deste grupo exigem login
  app.addHook('preHandler', app.authenticate)

  // GET /api/orders/search?orderNumber=XXXXXX — busca pedido pelo número
  app.get('/search', async (request, reply) => {
    const storeId = request.user.storeId
    const { orderNumber } = request.query as { orderNumber?: string }

    // Aceita apenas letras, números e hífen — mesmo formato usado na criação do pedido
    const numero = orderNumber?.trim().slice(0, 20) ?? ''
    if (!numero || !/^[A-Za-z0-9-]+$/.test(numero)) {
      return reply.status(400).send({ message: 'Informe o número do pedido.' })
    }

    // O número do pedido é único dentro de cada loja — busca pela chave composta
    const order = await app.prisma.order.findUnique({
      where: { storeId_orderNumber: { storeId, orderNumber: numero } },
    })

    if (!order) {
      return reply.status(404).send({ message: 'Pedido não encontrado.' })
    }

    return reply.send(order)
  })

  // GET /api/orders — lista pedidos com filtro opcional de status
  app.get('/', async (request, reply) => {
    const storeId = request.user.storeId
    const { status } = request.query as { status?: string }

    // Só aceita os status conhecidos — qualquer outro valor é ignorado
    const validStatus = ['PENDING', 'SOLD', 'NOT_SOLD'].includes(status ?? '') ? status : undefined

    const orders = await app.prisma.order.findMany({
      where: { storeId, ...(validStatus ? { status: validStatus } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return reply.send(orders)
  })

  // PATCH /api/orders/:orderNumber/status — confirma ou rejeita um pedido
  app.patch('/:orderNumber/status', async (request, reply) => {
    const storeId = request.user.storeId

    // Valida o formato do número do pedido recebido na URL
    const rawOrderNumber = (request.params as { orderNumber: string }).orderNumber
    if (!/^[A-Za-z0-9-]{1,20}$/.test(rawOrderNumber)) {
      return reply.status(400).send({ message: 'Número do pedido inválido.' })
    }
    const orderNumber = rawOrderNumber
    const { status } = updateOrderStatusSchema.parse(request.body)

    const order = await app.prisma.order.findUnique({
      where: { storeId_orderNumber: { storeId, orderNumber } },
    })

    if (!order) {
      return reply.status(404).send({ message: 'Pedido não encontrado.' })
    }

    await app.prisma.order.updateMany({
      where: { storeId, orderNumber },
      data: { status },
    })
    const updated = await app.prisma.order.findUnique({
      where: { storeId_orderNumber: { storeId, orderNumber } },
    })

    return reply.send(updated)
  })
}
