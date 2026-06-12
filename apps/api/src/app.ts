import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { ZodError } from 'zod'
import { createRateLimitRedis } from './common/rate-limit-redis'
import { prismaPlugin } from './database/prisma.plugin'
import { jwtAuthPlugin } from './auth/jwt.plugin'
import { storeContextPlugin } from './store/store-context.plugin'
import { authRoutes } from './auth/auth.routes'
import { passwordResetRoutes } from './auth/password-reset.routes'
import { resendPlugin } from './email/resend.plugin'
import { catalogPublicRoutes, catalogAdminRoutes } from './catalog/catalog.routes'
import { couponPublicRoutes, couponAdminRoutes } from './coupons/coupon.routes'
import { promotionPublicRoutes, promotionAdminRoutes } from './promotions/promotion.routes'
import { featuredPublicRoutes, featuredAdminRoutes } from './featured/featured.routes'
import { categoryPublicRoutes, categoryAdminRoutes } from './categories/category.routes'
import { storeProfilePublicRoutes, storeProfileAdminRoutes } from './store-profile/store-profile.routes'
import { analyticsPublicRoutes, analyticsAdminRoutes } from './analytics/analytics.routes'
import { customerPublicRoutes, customerAdminRoutes } from './customers/customer.routes'
import { orderPublicRoutes, orderAdminRoutes } from './orders/order.routes'
import { notificationRoutes } from './notifications/notification.routes'

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
  app.register(helmet)

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

  app.register(authRoutes, { prefix: '/api/auth' })
  app.register(passwordResetRoutes, { prefix: '/api/auth' })

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

  app.get('/api/health', async () => ({ status: 'ok' }))

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ message: 'Dados inválidos', errors: error.errors })
    }
    app.log.error(error)

    // Erros internos (500+) não devem expor detalhes do servidor ou do banco de dados
    const statusCode = error.statusCode ?? 500
    const message = statusCode >= 500 ? 'Erro interno do servidor' : error.message
    reply.status(statusCode).send({ message })
  })

  return app
}
