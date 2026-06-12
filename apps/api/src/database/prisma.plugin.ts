import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import type { FastifyPluginAsync } from 'fastify'
import { comProtecaoDeLoja } from './tenant-guard'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
    /**
     * Cliente SEM a proteção de loja — apenas para operações da plataforma que
     * são globais por natureza (ex: webhook do MercadoPago, que localiza a
     * assinatura pelo ID externo; rotas super-admin). NUNCA use em rotas de loja.
     */
    prismaRaw: PrismaClient
  }
}

// Nos testes é possível injetar um banco de dados falso pelo campo "client" —
// assim os testes rodam sem precisar de um PostgreSQL de verdade
type PrismaPluginOptions = {
  client?: PrismaClient
}

const plugin: FastifyPluginAsync<PrismaPluginOptions> = async (app, options) => {
  const isInjectedClient = Boolean(options.client)
  const clienteBase = options.client ?? new PrismaClient()

  // Só conecta/desconecta quando o cliente é real — o falso não tem conexão
  if (!isInjectedClient) {
    await clienteBase.$connect()
  }

  // Toda consulta passa pela proteção de loja (multi-tenancy) — consultas em
  // dados de loja sem o filtro storeId são bloqueadas com erro. Veja tenant-guard.ts.
  const prisma = comProtecaoDeLoja(clienteBase)

  app.decorate('prisma', prisma)
  // Acesso sem o guard — restrito a operações globais da plataforma (veja o aviso acima)
  app.decorate('prismaRaw', clienteBase)

  app.addHook('onClose', async () => {
    if (!isInjectedClient) {
      await prisma.$disconnect()
    }
  })
}

export const prismaPlugin = fp(plugin)
