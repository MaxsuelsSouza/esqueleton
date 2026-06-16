// Plugin que cria o armazém de sacola/favoritos e disponibiliza em app.sessionStore
//
// Com REDIS_URL: os dados ficam em Redis (Upstash) com expiração automática de 30 dias.
// Sem REDIS_URL: ficam em memória (funciona em dev, mas perde dados ao reiniciar).
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { createSessionStore, type SessionStore } from '../../domain/session/store/session-store'

declare module 'fastify' {
  interface FastifyInstance {
    sessionStore: SessionStore
  }
}

export const sessionPlugin = fp(async (app: FastifyInstance) => {
  const store = createSessionStore(process.env.REDIS_URL)

  if (!process.env.REDIS_URL) {
    app.log.warn(
      'REDIS_URL não definido — sacola e favoritos ficam em memória ' +
      '(perdem-se ao reiniciar o servidor). Configure o Upstash para persistir.',
    )
  }

  app.decorate('sessionStore', store)

  // Fecha a conexão Redis ao encerrar o servidor
  app.addHook('onClose', async () => {
    await store.close()
  })
})
