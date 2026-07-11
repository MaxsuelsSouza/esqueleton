// Rotas de cobrança e assinatura de planos.
//   - billingPublicRoutes: lista de planos (público, para página de preços)
//   - billingAdminRoutes: assinatura atual, upgrade e cancelamento (JWT obrigatório)
import type { FastifyPluginAsync } from 'fastify'
import { subscribeSchema, invoicesQuerySchema } from '../../schemas/billing.schema'
import { requireOwner } from '../../../domain/identity/guards/role.guard'
import { trialStatus } from '../../../domain/billing/trial'
import { proximoDiaDezUnix } from '../../../domain/billing/billing-cycle'

// Quantas faturas cada página do histórico traz
const FATURAS_POR_PAGINA = 12

// Campos públicos do plano — o que o lojista pode ver. Exclui os IDs internos
// do Stripe (stripeProductId/stripePriceId) e metadados de controle, que não têm
// utilidade no painel e não devem vazar na resposta.
const PLAN_PUBLIC_SELECT = {
  id: true,
  name: true,
  slug: true,
  limits: true,
  priceInCents: true,
  billingPeriod: true,
  sortOrder: true,
} as const

// ── Rota pública — lista planos disponíveis ───────────────────────
export const billingPublicRoutes: FastifyPluginAsync = async (app) => {
  // Lista planos ativos ordenados por sortOrder — usado na página de preços
  app.get('/plans', async () => {
    return app.prisma.plan.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      select: PLAN_PUBLIC_SELECT,
    })
  })
}

// ── Rotas do admin — JWT obrigatório ───────────────────────
export const billingAdminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate)

  // Retorna a assinatura atual da loja, o plano, o uso, o período de teste
  // e se a loja está disponível para o público ("pagou, usou")
  app.get('/current', async (request) => {
    const storeId = request.user.storeId

    // Busca a assinatura mais recente (para exibição) e a loja (para o período de teste)
    const [subscription, store] = await Promise.all([
      app.prisma.subscription.findFirst({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
        include: { plan: { select: PLAN_PUBLIC_SELECT } },
      }),
      app.prisma.store.findUnique({ where: { id: storeId } }),
    ])

    // Situação do período de teste de 7 dias, contado do cadastro da loja
    const trial = store ? trialStatus(store.createdAt) : null
    // A loja fica no ar com assinatura ATIVA ou dentro do período de teste
    const hasActiveSubscription = subscription?.status === 'ACTIVE'
    const storeAvailable = hasActiveSubscription || Boolean(trial?.active)

    if (!subscription) {
      return { subscription: null, usage: null, trial, storeAvailable }
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
      trial,
      storeAvailable,
    }
  })

  // Histórico de faturas da loja (Faturas) — apenas o que vem do Stripe.
  // Sem Customer (nunca fez checkout pago) → lista vazia; o front mostra a
  // mensagem de "nenhuma fatura ainda".
  app.get('/invoices', async (request) => {
    const { startingAfter } = invoicesQuerySchema.parse(request.query)

    const store = await app.prisma.store.findUnique({
      where: { id: request.user.storeId },
      select: { stripeCustomerId: true },
    })

    if (!store?.stripeCustomerId) {
      return { data: [], hasMore: false }
    }

    const { data, hasMore } = await app.stripe.listInvoices({
      customerId: store.stripeCustomerId,
      limit: FATURAS_POR_PAGINA,
      startingAfter,
    })

    // Converte o unix (segundos) do Stripe para ISO — o front formata em pt-BR
    return {
      data: data.map((invoice) => ({
        id: invoice.id,
        createdAt: new Date(invoice.createdAt * 1000).toISOString(),
        amountInCents: invoice.amountInCents,
        currency: invoice.currency,
        status: invoice.status,
        hostedInvoiceUrl: invoice.hostedInvoiceUrl,
      })),
      hasMore,
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
      // Cancela no Stripe se existir
      if (currentSub.stripeSubscriptionId) {
        await app.stripe.cancelSubscription(currentSub.stripeSubscriptionId)
      }
      // updateMany com id + storeId: só altera se a assinatura for desta loja (tenant guard)
      await app.prisma.subscription.updateMany({
        where: { id: currentSub.id, storeId },
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
        include: { plan: { select: PLAN_PUBLIC_SELECT } },
      })
      return { subscription, checkoutUrl: null }
    }

    // Plano pago: cria a sessão de checkout no Stripe e redireciona o lojista
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'

    // Se o plano não tem preço no Stripe, não é possível assinar
    if (!plan.stripePriceId && app.stripe.isConfigured) {
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
      include: { plan: { select: PLAN_PUBLIC_SELECT } },
    })

    // Se o Stripe não está configurado (dev), retorna sem checkout
    if (!app.stripe.isConfigured) {
      app.log.warn('Stripe não configurado — assinatura criada como PENDING sem checkout')
      return { subscription, checkoutUrl: null }
    }

    // Reaproveita o Customer da loja se já existir (troca de plano); senão o Stripe
    // cria um novo a partir do e-mail e o webhook o salva em Store.stripeCustomerId
    const store = await app.prisma.store.findUnique({ where: { id: storeId } })

    const session = await app.stripe.createCheckoutSession({
      priceId: plan.stripePriceId!,
      referenceId: subscription.id,
      customerId: store?.stripeCustomerId,
      customerEmail: userEmail,
      // Primeiro débito no dia 10 do mês seguinte — não cobra o mês vigente
      trialEnd: proximoDiaDezUnix(new Date()),
      successUrl: `${frontendUrl}/admin/plano`,
      cancelUrl: `${frontendUrl}/admin/plano`,
    })

    return { subscription, checkoutUrl: session?.url ?? null }
  })

  // Cancela a assinatura ativa — sem assinatura, a loja sai do ar para o público
  // (modelo "pagou, usou"; o painel continua acessível para reativar)
  app.post('/cancel', { preHandler: [requireOwner] }, async (request, reply) => {
    const storeId = request.user.storeId

    const currentSub = await app.prisma.subscription.findFirst({
      where: { storeId, status: 'ACTIVE' },
      include: { plan: { select: PLAN_PUBLIC_SELECT } },
    })

    if (!currentSub) {
      return reply.status(400).send({ message: 'Nenhuma assinatura ativa encontrada.' })
    }

    // Cancela no Stripe se existir
    if (currentSub.stripeSubscriptionId) {
      await app.stripe.cancelSubscription(currentSub.stripeSubscriptionId)
    }

    // Marca como cancelada — updateMany com id + storeId satisfaz o tenant guard
    await app.prisma.subscription.updateMany({
      where: { id: currentSub.id, storeId },
      data: { status: 'CANCELLED' },
    })

    return {
      message: 'Assinatura cancelada. Sem uma assinatura ativa, sua loja fica indisponível para os clientes — você pode reativar quando quiser.',
    }
  })
}
