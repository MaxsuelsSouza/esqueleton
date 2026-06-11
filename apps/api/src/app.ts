import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { ZodError } from 'zod'
import { prismaPlugin } from './database/prisma.plugin'
import { jwtAuthPlugin } from './auth/jwt.plugin'
import { authRoutes } from './auth/auth.routes'
import { catalogRoutes } from './catalog/catalog.routes'
import { couponRoutes } from './coupons/coupon.routes'
import { promotionRoutes } from './promotions/promotion.routes'
import { featuredRoutes } from './featured/featured.routes'
import { categoryRoutes } from './categories/category.routes'
import { storeProfileRoutes } from './store-profile/store-profile.routes'
import { analyticsRoutes } from './analytics/analytics.routes'
import { customerRoutes } from './customers/customer.routes'
import { orderRoutes } from './orders/order.routes'
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
  // Observação: em ambiente serverless (Vercel) o contador vive na memória de cada instância,
  // então o limite é aproximado — ainda assim barra a maior parte dos abusos.
  app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      statusCode: 429,
      message: 'Muitas requisições. Aguarde um instante e tente novamente.',
    }),
  })

  app.register(prismaPlugin, { client: options.prisma })
  app.register(jwtAuthPlugin)

  app.register(authRoutes, { prefix: '/api/auth' })
  app.register(catalogRoutes, { prefix: '/api/products' })
  app.register(couponRoutes, { prefix: '/api/coupons' })
  app.register(promotionRoutes, { prefix: '/api/promotions' })
  app.register(featuredRoutes, { prefix: '/api/featured' })
  app.register(categoryRoutes, { prefix: '/api/categories' })
  app.register(storeProfileRoutes, { prefix: '/api/store-profile' })
  app.register(analyticsRoutes, { prefix: '/api/analytics' })
  app.register(customerRoutes, { prefix: '/api/customers' })
  app.register(orderRoutes, { prefix: '/api/orders' })
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
