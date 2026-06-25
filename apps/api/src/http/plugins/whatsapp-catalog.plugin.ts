// Plugin Fastify que expõe app.whatsappCatalog — usado pelas rotas admin para sincronizar
// produtos com o catálogo do WhatsApp Business de cada loja.
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import {
  whatsappCatalogService,
  type WhatsAppCatalogService,
} from '../../domain/catalog/integrations/whatsapp-catalog.adapter'

declare module 'fastify' {
  interface FastifyInstance {
    whatsappCatalog: WhatsAppCatalogService
  }
}

export const whatsappCatalogPlugin = fp(async (app: FastifyInstance) => {
  app.decorate('whatsappCatalog', whatsappCatalogService)
})
