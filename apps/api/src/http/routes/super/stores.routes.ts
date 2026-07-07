// Gestão de lojas da plataforma — exclusivo do super-admin.
// Usa prismaRaw (sem tenant guard) porque as consultas atravessam todas as lojas.
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { requireSuperAdmin } from '../../../domain/identity/guards/super-admin.guard'
import { idParamSchema } from '../../../shared/validation/schemas'
import { registerStore } from '../../../domain/identity/services/auth.service'
import { emailVerificationEmail } from '../../../shared/email/templates'
import {
  listStoresQuerySchema,
  updateStoreSchema,
  createStoreSchema,
  paymentLinkSchema,
} from '../../schemas/super.schema'

const LOJAS_POR_PAGINA = 20

type PlanoEscolhido = {
  id: string
  priceInCents: number
  mercadoPagoPreapprovalPlanId: string | null
}

// Cria a assinatura da loja no plano escolhido e, se for pago, gera o link de
// pagamento do MercadoPago (init_point). O cliente abre o link, cadastra o
// cartão e o webhook muda a assinatura de PENDING para ACTIVE.
// Plano gratuito nasce ACTIVE direto, sem link.
async function criarAssinaturaComLink(
  app: FastifyInstance,
  storeId: string,
  plan: PlanoEscolhido,
  payerEmail: string,
): Promise<{ subscription: { id: string; status: string }; paymentLink: string | null }> {
  if (plan.priceInCents === 0) {
    const subscription = await app.prisma.subscription.create({
      data: { storeId, planId: plan.id, status: 'ACTIVE' },
    })
    return { subscription, paymentLink: null }
  }

  // Plano pago: fica PENDING até o cliente pagar pelo link
  const subscription = await app.prisma.subscription.create({
    data: { storeId, planId: plan.id, status: 'PENDING' },
  })

  // Sem MercadoPago configurado (dev), a assinatura fica PENDING sem link
  if (!app.mercadopago.isConfigured) {
    app.log.warn('MercadoPago não configurado — assinatura criada como PENDING sem link de pagamento')
    return { subscription, paymentLink: null }
  }

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
  const mpResult = await app.mercadopago.createSubscription({
    planId: plan.mercadoPagoPreapprovalPlanId!,
    payerEmail,
    externalReference: subscription.id,
    backUrl: `${frontendUrl}/admin/plano`,
  })

  if (!mpResult) {
    return { subscription, paymentLink: null }
  }

  await app.prisma.subscription.updateMany({
    where: { id: subscription.id, storeId },
    data: { mercadoPagoPreapprovalId: mpResult.id },
  })
  return { subscription, paymentLink: mpResult.initPoint }
}

export const superStoresRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate)
  app.addHook('preHandler', requireSuperAdmin)

  // GET /api/super/stores — lista lojas com busca, filtro por status e paginação
  app.get('/', async (request) => {
    const { page, search, status } = listStoresQuerySchema.parse(request.query)

    const where = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { slug: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [stores, total] = await Promise.all([
      app.prismaRaw.store.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * LOJAS_POR_PAGINA,
        take: LOJAS_POR_PAGINA,
        include: {
          // Assinatura mais recente com o plano — mostra o plano atual na tabela
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { plan: { select: { id: true, name: true } } },
          },
          _count: { select: { users: true, products: true } },
        },
      }),
      app.prismaRaw.store.count({ where }),
    ])

    return {
      data: stores.map((store) => ({
        id: store.id,
        slug: store.slug,
        name: store.name,
        status: store.status,
        createdAt: store.createdAt,
        usersCount: store._count.users,
        productsCount: store._count.products,
        plan: store.subscriptions[0]?.plan ?? null,
        subscriptionStatus: store.subscriptions[0]?.status ?? null,
      })),
      total,
      page,
      perPage: LOJAS_POR_PAGINA,
    }
  })

  // GET /api/super/stores/:id — detalhe da loja: usuários, assinatura e números
  app.get('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)

    const store = await app.prismaRaw.store.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, email: true, role: true, emailVerified: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
        _count: { select: { products: true, orders: true, coupons: true } },
      },
    })

    if (!store) {
      return reply.status(404).send({ message: 'Loja não encontrada' })
    }

    return {
      id: store.id,
      slug: store.slug,
      name: store.name,
      status: store.status,
      createdAt: store.createdAt,
      users: store.users,
      subscription: store.subscriptions[0] ?? null,
      counts: store._count,
    }
  })

  // POST /api/super/stores — venda presencial: o super-admin cadastra a loja,
  // o dono (com senha temporária) e o plano em um passo só. Para plano pago,
  // devolve o link de pagamento para enviar ao cliente — a loja só passa a ter
  // assinatura ativa quando ele cadastrar o cartão (webhook confirma).
  app.post('/', async (request, reply) => {
    const dados = createStoreSchema.parse(request.body)

    // O plano precisa existir e estar ativo
    const plan = await app.prisma.plan.findUnique({ where: { id: dados.planId } })
    if (!plan || !plan.active) {
      return reply.status(404).send({ message: 'Plano não encontrado' })
    }

    // Plano pago sem recorrência criada no MercadoPago não tem como gerar link
    if (plan.priceInCents > 0 && app.mercadopago.isConfigured && !plan.mercadoPagoPreapprovalPlanId) {
      return reply.status(400).send({
        message: 'Plano não configurado para cobrança. Edite o plano em Plataforma → Planos.',
      })
    }

    const [existingUser, existingStore] = await Promise.all([
      app.prisma.user.findUnique({ where: { email: dados.email } }),
      app.prisma.store.findUnique({ where: { slug: dados.storeSlug } }),
    ])
    if (existingUser) {
      return reply.status(409).send({ message: 'Email já cadastrado' })
    }
    if (existingStore) {
      return reply.status(409).send({ message: 'Este endereço de loja já está em uso — escolha outro' })
    }

    const hashed = await bcrypt.hash(dados.password, 10)

    // Loja, perfil e dono nascem juntos — senha temporária com troca obrigatória
    // no primeiro login; o aceite dos termos fica pendente (quem cadastrou foi o vendedor)
    const result = await registerStore(app.prisma, {
      email: dados.email,
      hashedPassword: hashed,
      storeName: dados.storeName,
      storeSlug: dados.storeSlug,
      whatsapp: dados.whatsapp,
      mustChangePassword: true,
      termosAceitosPeloDono: false,
    })

    // Assinatura no plano escolhido (+ link de pagamento se for plano pago)
    const { subscription, paymentLink } = await criarAssinaturaComLink(
      app,
      result.store.id,
      plan,
      dados.email,
    )

    // E-mail de verificação — igual ao cadastro público; falha não impede a criação
    try {
      const verificationToken = crypto.randomBytes(32).toString('hex')
      await app.prisma.emailVerificationToken.create({
        data: {
          token: verificationToken,
          userId: result.user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })
      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
      const verifyUrl = `${frontendUrl}/admin/verificar-email?token=${verificationToken}`
      await app.email.send(
        dados.email,
        'Confirme seu e-mail — Esqueleton',
        emailVerificationEmail(verifyUrl, dados.storeName),
      )
    } catch (emailError) {
      app.log.error({ emailError, email: dados.email }, 'Falha ao enviar e-mail de verificação na criação pelo super-admin')
    }

    // Auditoria (LGPD): loja criada pela plataforma (venda presencial)
    app.audit({
      action: 'PLATAFORMA_LOJA_CRIADA',
      storeId: result.store.id,
      userId: request.user.sub,
      detail: `Loja "${result.store.name}" (${result.store.slug}) criada com o plano ${plan.id} para ${dados.email}`,
      ip: request.ip,
    })

    return reply.status(201).send({
      store: result.store,
      owner: { id: result.user.id, email: result.user.email },
      subscription: { id: subscription.id, status: subscription.status },
      paymentLink,
    })
  })

  // POST /api/super/stores/:id/payment-link — gera (ou regenera) o link de
  // pagamento de uma loja existente. Útil quando o link anterior se perdeu ou
  // a loja foi criada sem concluir o pagamento.
  app.post('/:id/payment-link', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const { planId } = paymentLinkSchema.parse(request.body)

    const store = await app.prismaRaw.store.findUnique({ where: { id } })
    if (!store) {
      return reply.status(404).send({ message: 'Loja não encontrada' })
    }

    const plan = await app.prisma.plan.findUnique({ where: { id: planId } })
    if (!plan || !plan.active) {
      return reply.status(404).send({ message: 'Plano não encontrado' })
    }
    if (plan.priceInCents === 0) {
      return reply.status(400).send({
        message: 'Plano gratuito não precisa de link de pagamento — use a troca de plano na lista de lojas.',
      })
    }
    if (app.mercadopago.isConfigured && !plan.mercadoPagoPreapprovalPlanId) {
      return reply.status(400).send({
        message: 'Plano não configurado para cobrança. Edite o plano em Plataforma → Planos.',
      })
    }

    // Loja com assinatura ativa não precisa de link — a troca de plano resolve
    const activeSub = await app.prisma.subscription.findFirst({
      where: { storeId: id, status: 'ACTIVE' },
    })
    if (activeSub) {
      return reply.status(400).send({
        message: 'A loja já possui uma assinatura ativa — use a troca de plano na lista de lojas.',
      })
    }

    // O e-mail do dono vai no checkout do MercadoPago
    const owner = await app.prismaRaw.user.findFirst({
      where: { storeId: id, role: 'OWNER' },
      orderBy: { createdAt: 'asc' },
    })
    if (!owner) {
      return reply.status(400).send({ message: 'A loja não possui um dono para vincular a cobrança.' })
    }

    // Cancela links pendentes anteriores para não haver duas cobranças em aberto
    const pendentes = await app.prisma.subscription.findMany({
      where: { storeId: id, status: 'PENDING' },
    })
    for (const pendente of pendentes) {
      if (pendente.mercadoPagoPreapprovalId) {
        await app.mercadopago.cancelSubscription(pendente.mercadoPagoPreapprovalId)
      }
    }
    if (pendentes.length > 0) {
      await app.prisma.subscription.updateMany({
        where: { storeId: id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      })
    }

    const { subscription, paymentLink } = await criarAssinaturaComLink(app, id, plan, owner.email)

    // Auditoria (LGPD): link de pagamento gerado pela plataforma
    app.audit({
      action: 'PLATAFORMA_LINK_PAGAMENTO_GERADO',
      storeId: id,
      userId: request.user.sub,
      detail: `Link de pagamento do plano ${plan.id} gerado para a loja "${store.name}"`,
      ip: request.ip,
    })

    return {
      subscription: { id: subscription.id, status: subscription.status },
      paymentLink,
    }
  })

  // PATCH /api/super/stores/:id — altera o status (suspender/reativar) e/ou o plano
  app.patch('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const { status, planId } = updateStoreSchema.parse(request.body)

    const store = await app.prismaRaw.store.findUnique({ where: { id } })
    if (!store) {
      return reply.status(404).send({ message: 'Loja não encontrada' })
    }

    if (status) {
      await app.prismaRaw.store.update({ where: { id }, data: { status } })
      app.log.info({ storeId: id, status }, 'Super-admin alterou o status da loja')
    }

    // Troca de plano direta (cortesia/ajuste) — cancela a assinatura atual e
    // cria uma nova já ativa, sem passar pelo checkout do MercadoPago
    if (planId) {
      const plan = await app.prisma.plan.findUnique({ where: { id: planId } })
      if (!plan) {
        return reply.status(404).send({ message: 'Plano não encontrado' })
      }

      const currentSub = await app.prismaRaw.subscription.findFirst({
        where: { storeId: id, status: 'ACTIVE' },
      })
      if (currentSub) {
        // Cancela a recorrência no MercadoPago se existir
        if (currentSub.mercadoPagoPreapprovalId) {
          await app.mercadopago.cancelSubscription(currentSub.mercadoPagoPreapprovalId)
        }
        await app.prismaRaw.subscription.update({
          where: { id: currentSub.id },
          data: { status: 'CANCELLED' },
        })
      }

      await app.prismaRaw.subscription.create({
        data: { storeId: id, planId: plan.id, status: 'ACTIVE' },
      })
      app.log.info({ storeId: id, planId }, 'Super-admin alterou o plano da loja')
    }

    // Auditoria (LGPD): ação de plataforma sobre uma loja (status e/ou plano)
    app.audit({
      action: 'PLATAFORMA_LOJA_ALTERADA',
      storeId: id,
      userId: request.user.sub,
      detail: [status && `status → ${status}`, planId && `plano → ${planId}`]
        .filter(Boolean)
        .join('; '),
      ip: request.ip,
    })

    return { message: 'Loja atualizada com sucesso' }
  })
}
