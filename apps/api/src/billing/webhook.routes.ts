// Webhook do MercadoPago — recebe notificações de pagamentos de assinatura.
// Valida a assinatura HMAC do cabeçalho antes de processar.
// Sem MERCADOPAGO_WEBHOOK_SECRET, aceita tudo (dev only).
import type { FastifyPluginAsync } from 'fastify'
import crypto from 'crypto'

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/webhooks/mercadopago — sem autenticação (vem direto do MercadoPago)
  app.post('/mercadopago', async (request, reply) => {
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET

    // Valida a assinatura se o secret estiver configurado
    if (webhookSecret) {
      const signature = (request.headers['x-signature'] as string) ?? ''
      const requestId = (request.headers['x-request-id'] as string) ?? ''

      // Extrai ts e v1 do header x-signature (formato: "ts=...,v1=...")
      const parts = Object.fromEntries(
        signature.split(',').map((part) => {
          const [key, ...rest] = part.trim().split('=')
          return [key, rest.join('=')]
        })
      )

      const ts = parts['ts'] ?? ''
      const v1 = parts['v1'] ?? ''

      // O body do webhook contém data.id — usado na validação
      const body = request.body as Record<string, unknown>
      const dataId = (body?.data as Record<string, unknown>)?.id ?? ''

      // Template de validação do MercadoPago: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
      const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
      const expectedHash = crypto
        .createHmac('sha256', webhookSecret)
        .update(manifest)
        .digest('hex')

      if (v1 !== expectedHash) {
        app.log.warn('Webhook MercadoPago: assinatura inválida')
        return reply.status(401).send({ message: 'Assinatura inválida' })
      }
    }

    const body = request.body as Record<string, unknown>
    const type = body?.type as string | undefined
    const action = body?.action as string | undefined
    const dataId = (body?.data as Record<string, unknown>)?.id as string | undefined

    // Só processa eventos de assinatura (preapproval)
    if (type !== 'subscription_preapproval' || !dataId) {
      return reply.status(200).send({ received: true })
    }

    app.log.info({ action, dataId }, 'Webhook MercadoPago: evento de assinatura')

    // Busca a assinatura no banco pelo ID do MercadoPago
    const subscription = await app.prisma.subscription.findFirst({
      where: { mercadoPagoPreapprovalId: dataId },
    })

    if (!subscription) {
      app.log.warn({ dataId }, 'Webhook MercadoPago: assinatura não encontrada no banco')
      return reply.status(200).send({ received: true })
    }

    // Mapeia o status do MercadoPago para o nosso
    let newStatus: string | null = null
    if (action === 'updated' || action === 'created') {
      // Precisamos consultar o MercadoPago para saber o status real
      // mas para simplificar, mapeamos pela ação
      // Em produção, consultar GET /preapproval/:id para obter o status
    }

    // O MercadoPago envia o status diretamente no body em algumas notificações
    const mpStatus = (body?.data as Record<string, unknown>)?.status as string | undefined

    if (mpStatus === 'authorized' || mpStatus === 'active') {
      newStatus = 'ACTIVE'
    } else if (mpStatus === 'paused') {
      newStatus = 'PAUSED'
    } else if (mpStatus === 'cancelled') {
      newStatus = 'CANCELLED'
    } else if (mpStatus === 'pending') {
      newStatus = 'PENDING'
    }

    if (newStatus && newStatus !== subscription.status) {
      await app.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: newStatus,
          ...(newStatus === 'ACTIVE' ? { currentPeriodStart: new Date() } : {}),
        },
      })
      app.log.info({ subscriptionId: subscription.id, newStatus }, 'Assinatura atualizada pelo webhook')

      // Se cancelou, cria assinatura gratuita automaticamente
      if (newStatus === 'CANCELLED') {
        const freePlan = await app.prisma.plan.findFirst({
          where: { priceInCents: 0, active: true },
          orderBy: { sortOrder: 'asc' },
        })
        if (freePlan) {
          await app.prisma.subscription.create({
            data: {
              storeId: subscription.storeId,
              planId: freePlan.id,
              status: 'ACTIVE',
            },
          })
        }
      }
    }

    return reply.status(200).send({ received: true })
  })
}
