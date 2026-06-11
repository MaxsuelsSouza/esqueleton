import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import type { FastifyPluginAsync } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

// Nos testes é possível injetar um banco de dados falso pelo campo "client" —
// assim os testes rodam sem precisar de um PostgreSQL de verdade
type PrismaPluginOptions = {
  client?: PrismaClient
}

const plugin: FastifyPluginAsync<PrismaPluginOptions> = async (app, options) => {
  const isInjectedClient = Boolean(options.client)
  const prisma = options.client ?? new PrismaClient()

  // Só conecta/desconecta quando o cliente é real — o falso não tem conexão
  if (!isInjectedClient) {
    await prisma.$connect()
  }

  app.decorate('prisma', prisma)

  app.addHook('onClose', async () => {
    if (!isInjectedClient) {
      await prisma.$disconnect()
    }
  })
}

export const prismaPlugin = fp(plugin)
