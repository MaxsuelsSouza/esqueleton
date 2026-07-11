// Webhook do Stripe — recebe notificações de pagamentos de assinatura.
// A assinatura é validada pelo SDK do Stripe (stripe.webhooks.constructEvent),
// que exige o corpo bruto da requisição (byte a byte). Sem STRIPE_WEBHOOK_SECRET,
// aceita tudo e parseia o JSON direto (dev only).
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import type Stripe from 'stripe'
import { subscriptionPaymentFailedEmail } from '../../../shared/email/templates'

// Envia ao OWNER da loja o aviso de pagamento não efetuado. Fire-and-forget:
// o webhook não pode travar por causa do e-mail. Usa prismaRaw (sem tenant guard)
// porque o webhook não tem contexto de loja.
async function avisarFalhaDePagamento(app: FastifyInstance, storeId: string) {
  try {
    const [owner, store] = await Promise.all([
      app.prismaRaw.user.findFirst({
        where: { storeId, role: 'OWNER' },
        orderBy: { createdAt: 'asc' },
        select: { email: true },
      }),
      app.prismaRaw.store.findUnique({ where: { id: storeId }, select: { name: true } }),
    ])
    if (!owner) return

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
    await app.email.send(
      owner.email,
      'Pagamento não efetuado — sua loja está desativada',
      subscriptionPaymentFailedEmail(store?.name ?? 'sua loja', `${frontendUrl}/admin/plano`),
    )
  } catch (error) {
    app.log.error(error, 'Falha ao enviar e-mail de pagamento não efetuado')
  }
}

// Mapeia o status da assinatura do Stripe para o nosso.
// active/trialing = em dia | past_due/unpaid = pagamento pendente
// canceled = cancelada | incomplete = aguardando primeiro pagamento
function mapStripeStatus(stripeStatus: string): string | null {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') return 'ACTIVE'
  if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') return 'PAUSED'
  if (stripeStatus === 'canceled' || stripeStatus === 'incomplete_expired') return 'CANCELLED'
  if (stripeStatus === 'incomplete') return 'PENDING'
  return null
}

type SubscriptionRow = { id: string; storeId: string; status: string }

// Atualiza o status da assinatura e avisa o lojista quando pausa ou cancela.
// updateMany com id + storeId satisfaz o tenant guard e garante que só a
// assinatura da loja correta é alterada.
async function atualizarStatus(app: FastifyInstance, sub: SubscriptionRow, newStatus: string) {
  if (newStatus === sub.status) return

  await app.prisma.subscription.updateMany({
    where: { id: sub.id, storeId: sub.storeId },
    data: {
      status: newStatus,
      ...(newStatus === 'ACTIVE' ? { currentPeriodStart: new Date() } : {}),
    },
  })
  app.log.info({ subscriptionId: sub.id, newStatus }, 'Assinatura atualizada pelo webhook')

  // Pagamento falhou — assinatura pausada até regularizar (fire and forget)
  if (newStatus === 'PAUSED') {
    app.prisma.notification.upsert({
      where: { storeId_type_entityId: { storeId: sub.storeId, type: 'SUBSCRIPTION_PAYMENT_FAILED', entityId: sub.id } },
      create: {
        storeId: sub.storeId,
        type: 'SUBSCRIPTION_PAYMENT_FAILED',
        title: 'O pagamento da sua assinatura falhou',
        body: 'A assinatura foi pausada até o pagamento ser regularizado.',
        entityId: sub.id,
      },
      update: { status: 'PENDING', createdAt: new Date() },
    }).catch(() => {})
  }

  // Cancelada — sem assinatura ativa a loja sai do ar para os clientes ("pagou, usou")
  if (newStatus === 'CANCELLED') {
    app.prisma.notification.upsert({
      where: { storeId_type_entityId: { storeId: sub.storeId, type: 'SUBSCRIPTION_CANCELLED', entityId: sub.id } },
      create: {
        storeId: sub.storeId,
        type: 'SUBSCRIPTION_CANCELLED',
        title: 'Sua assinatura foi cancelada',
        body: 'Sem uma assinatura ativa, sua loja fica indisponível para os clientes. Reative quando quiser.',
        entityId: sub.id,
      },
      update: { status: 'PENDING', createdAt: new Date() },
    }).catch(() => {})
  }
}

// Localiza a assinatura pelo ID da assinatura recorrente do Stripe.
// Usa prismaRaw (sem tenant guard): o webhook não sabe de qual loja é a assinatura.
async function acharPorStripeSubscription(app: FastifyInstance, stripeSubscriptionId: string) {
  return app.prismaRaw.subscription.findFirst({ where: { stripeSubscriptionId } })
}

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  // Preserva o corpo bruto (Buffer): o Stripe valida a assinatura sobre os bytes
  // originais. Este parser é encapsulado — vale só para as rotas deste plugin,
  // não afeta o parser JSON global usado pelo resto da API.
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body)
  })

  // POST /api/webhooks/stripe — sem autenticação (vem direto do Stripe)
  app.post('/stripe', async (request, reply) => {
    const rawBody = request.body as Buffer
    const signature = request.headers['stripe-signature'] as string | undefined

    let event: Stripe.Event | null = null

    if (app.stripe.webhookConfigured) {
      if (!signature) {
        return reply.status(400).send({ message: 'Assinatura ausente' })
      }
      try {
        event = app.stripe.constructWebhookEvent(rawBody, signature)
      } catch {
        app.log.warn('Webhook Stripe: assinatura inválida')
        return reply.status(401).send({ message: 'Assinatura inválida' })
      }
    } else {
      // Defesa em profundidade: em produção nunca aceitamos evento não assinado.
      // O plugin já recusa o boot nesse cenário, mas negamos aqui também.
      if (process.env.NODE_ENV === 'production') {
        app.log.error('Webhook Stripe recebido sem verificação de assinatura configurada em produção')
        return reply.status(500).send({ message: 'Webhook não configurado' })
      }
      // Dev sem STRIPE_WEBHOOK_SECRET: aceita e parseia o JSON direto
      try {
        event = JSON.parse(rawBody.toString()) as Stripe.Event
      } catch {
        return reply.status(400).send({ message: 'Corpo inválido' })
      }
    }

    if (!event) {
      return reply.status(200).send({ received: true })
    }

    app.log.info({ type: event.type }, 'Webhook Stripe: evento recebido')

    // Checkout concluído — a assinatura foi criada no Stripe. Ligamos a Subscription
    // do nosso banco (client_reference_id) ao Stripe e salvamos o Customer na loja.
    // ATENÇÃO: só ativamos quando o pagamento já foi confirmado (payment_status
    // 'paid', típico de cartão). Boleto/Pix chegam como 'unpaid' e a assinatura fica
    // 'incomplete' no Stripe — ativar aqui daria acesso grátis até o boleto compensar.
    // Nesses casos a assinatura fica PENDING e o evento customer.subscription.updated
    // a ativa quando o pagamento compensa.
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const referenceId = session.client_reference_id
      if (!referenceId) {
        return reply.status(200).send({ received: true })
      }

      const sub = await app.prismaRaw.subscription.findFirst({ where: { id: referenceId } })
      if (!sub) {
        app.log.warn({ referenceId }, 'Webhook Stripe: assinatura não encontrada no banco')
        return reply.status(200).send({ received: true })
      }

      const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
      const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
      // 'paid' = cartão cobrado agora. 'no_payment_required' = assinatura entrou em
      // trial (âncora do dia 10) — o cartão foi coletado, mas o débito é no dia 10;
      // a loja já pode ficar ativa. 'unpaid' (boleto/Pix) NÃO ativa — fica PENDING.
      const pagamentoConfirmado =
        session.payment_status === 'paid' || session.payment_status === 'no_payment_required'

      await app.prisma.subscription.updateMany({
        where: { id: sub.id, storeId: sub.storeId },
        data: {
          // Vincula o ID do Stripe sempre — é por ele que os eventos seguintes
          // (customer.subscription.updated) localizam a assinatura para ativar.
          ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
          // Ativa apenas com pagamento confirmado; senão fica PENDING
          ...(pagamentoConfirmado ? { status: 'ACTIVE', currentPeriodStart: new Date() } : {}),
        },
      })
      app.log.info(
        { subscriptionId: sub.id, paymentStatus: session.payment_status },
        pagamentoConfirmado ? 'Assinatura ativada pelo checkout' : 'Checkout concluído — aguardando confirmação de pagamento',
      )

      // Salva o Customer na loja para reaproveitar em futuras trocas de plano
      // (Store é isento do tenant guard — lookup/atualização por id direto)
      if (stripeCustomerId) {
        await app.prisma.store.update({
          where: { id: sub.storeId },
          data: { stripeCustomerId },
        }).catch(() => {})
      }

      return reply.status(200).send({ received: true })
    }

    // Assinatura atualizada — pagamento recorrente aprovado, falhou ou pausou
    if (event.type === 'customer.subscription.updated') {
      const stripeSub = event.data.object as Stripe.Subscription
      const sub = await acharPorStripeSubscription(app, stripeSub.id)
      if (sub) {
        const newStatus = mapStripeStatus(stripeSub.status)
        if (newStatus) await atualizarStatus(app, sub, newStatus)
      }
      return reply.status(200).send({ received: true })
    }

    // Assinatura removida no Stripe — cancela no nosso banco
    if (event.type === 'customer.subscription.deleted') {
      const stripeSub = event.data.object as Stripe.Subscription
      const sub = await acharPorStripeSubscription(app, stripeSub.id)
      if (sub) await atualizarStatus(app, sub, 'CANCELLED')
      return reply.status(200).send({ received: true })
    }

    // Cobrança da fatura falhou — pausa a assinatura (loja sai do ar) e avisa o
    // lojista por e-mail logo em seguida, com o link para regularizar o pagamento
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }
      const stripeSubscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
      if (stripeSubscriptionId) {
        const sub = await acharPorStripeSubscription(app, stripeSubscriptionId)
        if (sub) {
          await atualizarStatus(app, sub, 'PAUSED')
          // E-mail imediato ao lojista (fire-and-forget, não bloqueia a resposta)
          avisarFalhaDePagamento(app, sub.storeId)
        }
      }
      return reply.status(200).send({ received: true })
    }

    return reply.status(200).send({ received: true })
  })
}
