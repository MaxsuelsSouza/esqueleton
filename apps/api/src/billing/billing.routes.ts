// Rotas de cobrança e assinatura de planos.
//   - billingPublicRoutes: lista de planos (público, para página de preços)
//   - billingAdminRoutes: assinatura atual, upgrade e cancelamento (JWT obrigatório)
import type { FastifyPluginAsync } from 'fastify'
import { subscribeSchema } from './billing.schema'
import { requireOwner } from '../auth/role-guard'

// ── Rota pública — lista planos disponíveis ───────────────────────
export const billingPublicRoutes: FastifyPluginAsync = async (app) => {
  // Lista planos ativos ordenados por sortOrder — usado na página de preços
  app.get('/plans', async () => {
    return app.prisma.plan.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        limits: true,
        priceInCents: true,
        billingPeriod: true,
        sortOrder: true,
      },
    })
  })
}

// ── Rotas do admin — JWT obrigatório ───────────────────────
export const billingAdminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate)

  // Retorna a assinatura atual da loja com o plano e uso
  app.get('/current', async (request) => {
    const storeId = request.user.storeId

    // Busca a assinatura ativa (ou a mais recente)
    const subscription = await app.prisma.subscription.findFirst({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    })

    if (!subscription) {
      return { subscription: null, usage: null }
    }

    // Calcula o uso atual para exibir no painel
    const [productCount, userCount, orderCount] = await Promise.all([
      app.prisma.product.count({ where: { storeId } }),
      app.prisma.user.count({ where: { storeId } }),
      // Pedidos do mês corrente
      app.prisma.order.count({
        where: {
          storeId,
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
    ])

    return {
      subscription,
      usage: {
        products: productCount,
        users: userCount,
        ordersThisMonth: orderCount,
      },
    }
  })

  // Cria ou troca a assinatura da loja para um novo plano
  // Apenas o OWNER pode assinar ou trocar de plano
  app.post('/subscribe', { preHandler: [requireOwner] }, async (request, reply) => {
    const { planId } = subscribeSchema.parse(request.body)
    const storeId = request.user.storeId
    const userEmail = request.user.email

    // Busca o plano escolhido
    const plan = await app.prisma.plan.findUnique({ where: { id: planId } })
    if (!plan || !plan.active) {
      return reply.status(404).send({ message: 'Plano não encontrado.' })
    }

    // Se já tem assinatura ativa, cancela a anterior
    const currentSub = await app.prisma.subscription.findFirst({
      where: { storeId, status: 'ACTIVE' },
    })
    if (currentSub) {
      // Cancela no MercadoPago se existir
      if (currentSub.mercadoPagoPreapprovalId) {
        await app.mercadopago.cancelSubscription(currentSub.mercadoPagoPreapprovalId)
      }
      await app.prisma.subscription.update({
        where: { id: currentSub.id },
        data: { status: 'CANCELLED' },
      })
    }

    // Plano gratuito: cria assinatura diretamente como ACTIVE
    if (plan.priceInCents === 0) {
      const subscription = await app.prisma.subscription.create({
        data: {
          storeId,
          planId: plan.id,
          status: 'ACTIVE',
        },
        include: { plan: true },
      })
      return { subscription, checkoutUrl: null }
    }

    // Plano pago: cria assinatura no MercadoPago e redireciona para checkout
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'

    // Se o plano não tem ID no MercadoPago, não é possível assinar
    if (!plan.mercadoPagoPreapprovalPlanId && app.mercadopago.isConfigured) {
      return reply.status(400).send({
        message: 'Plano não configurado para cobrança. Entre em contato com o suporte.',
      })
    }

    // Cria assinatura como PENDING até o webhook confirmar
    const subscription = await app.prisma.subscription.create({
      data: {
        storeId,
        planId: plan.id,
        status: 'PENDING',
      },
      include: { plan: true },
    })

    // Se MercadoPago não está configurado (dev), retorna sem checkout
    if (!app.mercadopago.isConfigured) {
      app.log.warn('MercadoPago não configurado — assinatura criada como PENDING sem checkout')
      return { subscription, checkoutUrl: null }
    }

    // Cria a assinatura recorrente no MercadoPago
    const mpResult = await app.mercadopago.createSubscription({
      planId: plan.mercadoPagoPreapprovalPlanId!,
      payerEmail: userEmail,
      externalReference: subscription.id,
      backUrl: `${frontendUrl}/admin/plano`,
    })

    if (mpResult) {
      await app.prisma.subscription.update({
        where: { id: subscription.id },
        data: { mercadoPagoPreapprovalId: mpResult.id },
      })
      return { subscription, checkoutUrl: mpResult.initPoint }
    }

    return { subscription, checkoutUrl: null }
  })

  // Cancela a assinatura ativa e volta para o plano gratuito
  app.post('/cancel', { preHandler: [requireOwner] }, async (request, reply) => {
    const storeId = request.user.storeId

    const currentSub = await app.prisma.subscription.findFirst({
      where: { storeId, status: 'ACTIVE' },
      include: { plan: true },
    })

    if (!currentSub) {
      return reply.status(400).send({ message: 'Nenhuma assinatura ativa encontrada.' })
    }

    // Não permite cancelar o plano gratuito
    if (currentSub.plan.priceInCents === 0) {
      return reply.status(400).send({ message: 'Você já está no plano gratuito.' })
    }

    // Cancela no MercadoPago se existir
    if (currentSub.mercadoPagoPreapprovalId) {
      await app.mercadopago.cancelSubscription(currentSub.mercadoPagoPreapprovalId)
    }

    // Marca como cancelada
    await app.prisma.subscription.update({
      where: { id: currentSub.id },
      data: { status: 'CANCELLED' },
    })

    // Cria assinatura gratuita automaticamente
    const freePlan = await app.prisma.plan.findFirst({
      where: { priceInCents: 0, active: true },
      orderBy: { sortOrder: 'asc' },
    })

    if (freePlan) {
      await app.prisma.subscription.create({
        data: { storeId, planId: freePlan.id, status: 'ACTIVE' },
      })
    }

    return { message: 'Assinatura cancelada. Você voltou ao plano gratuito.' }
  })
}
