// Rotas de pedidos — divididas em dois grupos:
//   - orderPublicRoutes: criação pelo cliente no checkout, a loja vem do slug na URL
//   - orderAdminRoutes: gestão pelo painel, a loja vem do token JWT
import type { FastifyInstance } from 'fastify'
import { createOrderSchema, updateOrderStatusSchema } from './order.schema'

// ── Rota pública — a loja vem do slug na URL ───────────────────────
export async function orderPublicRoutes(app: FastifyInstance) {

  // POST /api/lojas/:slug/orders — público, chamado quando o cliente clica em "Enviar pelo WhatsApp"
  // Limite por IP — impede que alguém crie pedidos falsos em massa
  app.post('/', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const storeId = request.store!.id
    const data = createOrderSchema.parse(request.body)

    // Confere a aritmética do pedido — impede totais manipulados por requisições
    // montadas fora do site (tolerância de 1 centavo para arredondamentos)
    const somaDosItens = data.items.reduce((soma, item) => soma + item.lineTotal, 0)
    const itemComContaErrada = data.items.some(
      (item) => Math.abs(item.lineTotal - item.unitPrice * item.quantity) > 0.01
    )
    const subtotalNaoConfere = Math.abs(data.subtotal - somaDosItens) > 0.01
    const totalNaoConfere =
      data.discount > data.subtotal || Math.abs(data.total - (data.subtotal - data.discount)) > 0.01

    if (itemComContaErrada || subtotalNaoConfere || totalNaoConfere) {
      return reply.status(400).send({ message: 'Os valores do pedido não conferem.' })
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

    // Ao confirmar como VENDIDO, desconta o estoque de cada produto do pedido
    // Só executa se o pedido ainda não era SOLD — evita decrementar duas vezes
    if (status === 'SOLD' && order.status !== 'SOLD') {
      const items = order.items as Array<{ productId: string; quantity: number }>

      for (const item of items) {
        // Busca o produto para verificar se o estoque é controlado (stock !== null)
        const product = await app.prisma.product.findFirst({
          where: { id: item.productId, storeId },
          select: { id: true, name: true, brand: true, stock: true },
        })

        // Pula produtos não encontrados ou com estoque não controlado
        if (!product || product.stock === null) continue

        const novoEstoque = Math.max(0, product.stock - item.quantity)

        await app.prisma.product.updateMany({
          where: { id: product.id, storeId },
          data: { stock: novoEstoque },
        })

        // Notifica estoque baixo ou esgotado — fire and forget, igual ao que acontece ao editar produto
        const productName = product.brand ? `${product.brand} ${product.name}` : product.name
        if (novoEstoque === 0) {
          app.prisma.notification.upsert({
            where: { storeId_type_entityId: { storeId, type: 'OUT_OF_STOCK', entityId: product.id } },
            create: { storeId, type: 'OUT_OF_STOCK', title: `"${productName}" está sem estoque`, entityId: product.id },
            update: { status: 'PENDING', createdAt: new Date() },
          }).catch(() => {})
        } else if (novoEstoque < 3) {
          app.prisma.notification.upsert({
            where: { storeId_type_entityId: { storeId, type: 'LOW_STOCK', entityId: product.id } },
            create: { storeId, type: 'LOW_STOCK', title: `"${productName}" com estoque baixo`, body: `Restam ${novoEstoque} unidade${novoEstoque === 1 ? '' : 's'}`, entityId: product.id },
            update: { status: 'PENDING', body: `Restam ${novoEstoque} unidade${novoEstoque === 1 ? '' : 's'}`, createdAt: new Date() },
          }).catch(() => {})
        }
      }
    }

    return reply.send(updated)
  })
}
