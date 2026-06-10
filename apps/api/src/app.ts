import Fastify from 'fastify'
import cors from '@fastify/cors'
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

export function buildApp() {
  const app = Fastify({ logger: true })

  app.register(cors, { origin: process.env.CORS_ORIGIN ?? '*' })
  app.register(prismaPlugin)
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

  app.get('/api/health', async () => ({ status: 'ok' }))

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ message: 'Dados inválidos', errors: error.errors })
    }
    app.log.error(error)
    reply.status(error.statusCode ?? 500).send({ message: error.message })
  })

  return app
}
