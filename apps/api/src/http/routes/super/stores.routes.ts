// Gestão de lojas da plataforma — exclusivo do super-admin.
// Usa prismaRaw (sem tenant guard) porque as consultas atravessam todas as lojas.
import type { FastifyPluginAsync } from 'fastify'
import { requireSuperAdmin } from '../../../domain/identity/guards/super-admin.guard'
import { idParamSchema } from '../../../shared/validation/schemas'
import { listStoresQuerySchema, updateStoreSchema } from '../../schemas/super.schema'

const LOJAS_POR_PAGINA = 20

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
