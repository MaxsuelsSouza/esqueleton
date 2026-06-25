import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { createRateLimitRedis } from './shared/cache/rate-limit-redis'
import { prismaPlugin } from './shared/database/prisma.plugin'
import { resendPlugin } from './shared/email/resend.plugin'
import { registerErrorHandler } from './shared/errors/error-handler'
import { jwtAuthPlugin } from './http/plugins/jwt.plugin'
import { storeContextPlugin } from './http/plugins/store-context.plugin'
import { planLimitsPlugin } from './http/plugins/plan-limits.plugin'
import { sessionPlugin } from './http/plugins/session.plugin'
import { mercadopagoPlugin } from './domain/billing/integrations/mercadopago.adapter'
import { authRoutes, passwordResetRoutes, emailVerificationRoutes } from './http/routes/auth'
import { catalogPublicRoutes, catalogAdminRoutes, categoryPublicRoutes, categoryAdminRoutes } from './http/routes/catalog'
import { couponPublicRoutes, couponAdminRoutes, promotionPublicRoutes, promotionAdminRoutes, featuredPublicRoutes, featuredAdminRoutes } from './http/routes/pricing'
import { orderPublicRoutes, orderAdminRoutes, customerPublicRoutes, customerAdminRoutes } from './http/routes/order'
import { billingPublicRoutes, billingAdminRoutes } from './http/routes/billing'
import { webhookRoutes } from './http/routes/webhooks'
import { analyticsPublicRoutes, analyticsAdminRoutes } from './http/routes/analytics'
import { notificationRoutes } from './http/routes/notification'
import { userAdminRoutes, storeProfilePublicRoutes, storeProfileAdminRoutes } from './http/routes/admin'
import { superStoresRoutes, superPlansRoutes, superUsersRoutes, superMetricsRoutes } from './http/routes/super'
import { sessionPublicRoutes } from './http/routes/session'

// Nos testes é possível injetar um banco de dados falso — veja prisma.plugin.ts
type BuildAppOptions = {
  prisma?: import('@prisma/client').PrismaClient
}

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
    // Atrás de um proxy (Vercel, nginx) o IP real do cliente vem no cabeçalho
    // x-forwarded-for — sem isso o limite de requisições trataria todos os
    // visitantes como um único IP (o do proxy)
    trustProxy: true,
    // Imagens de produto e logo são enviadas embutidas (base64) no corpo da requisição.
    // O padrão do Fastify é apenas 1 MB, o que rejeitaria fotos comuns — 5 MB cobre a
    // imagem (limitada a ~3 MB pelo schema) mais os demais campos do formulário.
    bodyLimit: 5 * 1024 * 1024,
  })

  // Cabeçalhos de segurança HTTP (X-Content-Type-Options, X-Frame-Options etc.)
  // A API é acessada cross-origin pelo frontend (domínios diferentes no Vercel),
  // então desabilitamos as políticas de cross-origin do helmet que bloqueiam isso:
  // - permissionsPolicy: causa pop-ups de permissão indevidos em mobile
  // - crossOriginEmbedderPolicy: exige CORP em todos os recursos (incompatível com CORS)
  // - crossOriginResourcePolicy: bloqueia acesso cross-origin aos recursos da API
  // - contentSecurityPolicy: desabilitado porque a API retorna JSON, não HTML
  app.register(helmet, {
    permissionsPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  })

  // Avisa quando a API aceita requisições de qualquer site — em produção defina CORS_ORIGIN
  if (!process.env.CORS_ORIGIN) {
    app.log.warn('CORS_ORIGIN não definido — a API aceitará requisições de qualquer origem')
  }
  app.register(cors, { origin: process.env.CORS_ORIGIN ?? '*' })

  // Limite global de requisições por IP — protege contra abuso e sobrecarga.
  // Rotas sensíveis (login, cadastro, pedidos) têm limites mais rígidos definidos na própria rota.
  // Sem REDIS_URL os contadores ficam na memória do processo (ok em dev e VPS);
  // com REDIS_URL ficam em um Redis compartilhado — necessário em serverless
  // (Vercel), onde cada instância teria contadores próprios (veja rate-limit-redis.ts).
  const rateLimitRedis = createRateLimitRedis(process.env.REDIS_URL)
  if (rateLimitRedis) {
    // Fecha a conexão com o Redis junto com o servidor
    app.addHook('onClose', async () => {
      await rateLimitRedis.quit()
    })
  }
  app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    ...(rateLimitRedis
      ? {
          redis: rateLimitRedis,
          // Redis fora do ar não pode derrubar a API: a requisição passa sem ser contada
          skipOnError: true,
        }
      : {}),
    errorResponseBuilder: () => ({
      statusCode: 429,
      message: 'Muitas requisições. Aguarde um instante e tente novamente.',
    }),
  })

  app.register(prismaPlugin, { client: options.prisma })
  app.register(jwtAuthPlugin)
  app.register(resendPlugin)
  app.register(storeContextPlugin)
  // Cobrança: integração com o MercadoPago e verificação dos limites do plano
  app.register(mercadopagoPlugin)
  app.register(planLimitsPlugin)
  // Sacola e favoritos dos visitantes — armazenados em Redis (ou memória em dev)
  app.register(sessionPlugin)

  app.register(authRoutes, { prefix: '/api/auth' })
  app.register(passwordResetRoutes, { prefix: '/api/auth' })
  app.register(emailVerificationRoutes, { prefix: '/api/auth' })

  // ── Cobrança — planos públicos, assinatura da loja e webhook do MercadoPago ──
  app.register(billingPublicRoutes, { prefix: '/api/billing' })
  app.register(billingAdminRoutes, { prefix: '/api/billing' })
  app.register(webhookRoutes, { prefix: '/api/webhooks' })

  // ── Super-admin — gestão da plataforma (lojas, planos, usuários, métricas) ──
  // Todas exigem JWT com isSuperAdmin (flag definida manualmente no banco)
  app.register(superStoresRoutes, { prefix: '/api/super/stores' })
  app.register(superPlansRoutes, { prefix: '/api/super/plans' })
  app.register(superUsersRoutes, { prefix: '/api/super/users' })
  app.register(superMetricsRoutes, { prefix: '/api/super/metrics' })

  // ── Rotas públicas do catálogo — a loja é identificada pelo slug na URL ──
  // Ex: GET /api/lojas/perfumaria-ana/products
  // O preHandler resolveStore busca a loja pelo slug e anexa em request.store;
  // slug inexistente (ou loja suspensa) responde 404 antes de chegar à rota.
  app.register(
    async (publicApp) => {
      publicApp.addHook('preHandler', publicApp.resolveStore)

      publicApp.register(catalogPublicRoutes, { prefix: '/products' })
      publicApp.register(couponPublicRoutes, { prefix: '/coupons' })
      publicApp.register(promotionPublicRoutes, { prefix: '/promotions' })
      publicApp.register(featuredPublicRoutes, { prefix: '/featured' })
      publicApp.register(categoryPublicRoutes, { prefix: '/categories' })
      publicApp.register(storeProfilePublicRoutes, { prefix: '/store-profile' })
      publicApp.register(analyticsPublicRoutes, { prefix: '/analytics' })
      publicApp.register(customerPublicRoutes, { prefix: '/customers' })
      publicApp.register(orderPublicRoutes, { prefix: '/orders' })
      // Sacola e favoritos do visitante — identificados por X-Session-Token
      publicApp.register(sessionPublicRoutes, { prefix: '/session' })
    },
    { prefix: '/api/lojas/:slug' },
  )

  // ── Rotas do painel admin — a loja é identificada pelo token JWT ──
  app.register(catalogAdminRoutes, { prefix: '/api/products' })
  app.register(couponAdminRoutes, { prefix: '/api/coupons' })
  app.register(promotionAdminRoutes, { prefix: '/api/promotions' })
  app.register(featuredAdminRoutes, { prefix: '/api/featured' })
  app.register(categoryAdminRoutes, { prefix: '/api/categories' })
  app.register(storeProfileAdminRoutes, { prefix: '/api/store-profile' })
  app.register(analyticsAdminRoutes, { prefix: '/api/analytics' })
  app.register(customerAdminRoutes, { prefix: '/api/customers' })
  app.register(orderAdminRoutes, { prefix: '/api/orders' })
  app.register(notificationRoutes, { prefix: '/api/notifications' })
  app.register(userAdminRoutes, { prefix: '/api/users' })

  app.get('/api/health', async () => ({ status: 'ok' }))

  registerErrorHandler(app)

  return app
}
