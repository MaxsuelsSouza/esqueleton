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

    // Busca a assinatura no banco pelo ID do MercadoPago.
    // Usa prismaRaw (sem tenant guard): o webhook não sabe de qual loja é a
    // assinatura — é justamente esta busca que descobre.
    const subscription = await app.prismaRaw.subscription.findFirst({
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
      // updateMany com id + storeId: satisfaz o tenant guard e garante que o
      // registro alterado é exatamente o da loja encontrada acima
      await app.prisma.subscription.updateMany({
        where: { id: subscription.id, storeId: subscription.storeId },
        data: {
          status: newStatus,
          ...(newStatus === 'ACTIVE' ? { currentPeriodStart: new Date() } : {}),
        },
      })
      app.log.info({ subscriptionId: subscription.id, newStatus }, 'Assinatura atualizada pelo webhook')

      // Avisa o lojista no painel — fire and forget, o webhook responde rápido de qualquer forma
      if (newStatus === 'PAUSED') {
        app.prisma.notification.upsert({
          where: { storeId_type_entityId: { storeId: subscription.storeId, type: 'SUBSCRIPTION_PAYMENT_FAILED', entityId: subscription.id } },
          create: {
            storeId: subscription.storeId,
            type: 'SUBSCRIPTION_PAYMENT_FAILED',
            title: 'O pagamento da sua assinatura falhou',
            body: 'A assinatura foi pausada até o pagamento ser regularizado.',
            entityId: subscription.id,
          },
          update: { status: 'PENDING', createdAt: new Date() },
        }).catch(() => {})
      }

      // Se cancelou, avisa o lojista — sem assinatura ativa a loja sai do ar
      // para os clientes (modelo "pagou, usou")
      if (newStatus === 'CANCELLED') {
        app.prisma.notification.upsert({
          where: { storeId_type_entityId: { storeId: subscription.storeId, type: 'SUBSCRIPTION_CANCELLED', entityId: subscription.id } },
          create: {
            storeId: subscription.storeId,
            type: 'SUBSCRIPTION_CANCELLED',
            title: 'Sua assinatura foi cancelada',
            body: 'Sem uma assinatura ativa, sua loja fica indisponível para os clientes. Reative quando quiser.',
            entityId: subscription.id,
          },
          update: { status: 'PENDING', createdAt: new Date() },
        }).catch(() => {})
      }
    }

    return reply.status(200).send({ received: true })
  })
}
