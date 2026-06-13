// Rotas públicas de sacola e favoritos dos visitantes.
//
// Os dados ficam em Redis (ou em memória sem REDIS_URL) e são identificados por
// um token de sessão que o navegador do visitante gera e envia no header
// X-Session-Token. Não exige login — qualquer visitante pode ter uma sacola.
//
// Rotas:
//   GET    /cart       — retorna os itens da sacola
//   PUT    /cart       — substitui a sacola inteira (o frontend envia o estado completo)
//   DELETE /cart       — limpa a sacola
//   GET    /favorites  — retorna os IDs dos produtos favoritos
//   PUT    /favorites  — substitui a lista de favoritos
//   DELETE /favorites  — limpa os favoritos
import type { FastifyPluginAsync } from 'fastify'
import {
  sessionHeadersSchema,
  cartBodySchema,
  favoritesBodySchema,
} from './session.schema'

export const sessionPublicRoutes: FastifyPluginAsync = async (app) => {
  // Extrai e valida o token de sessão do header — usado em todas as rotas abaixo
  function getSessionToken(headers: Record<string, unknown>): string {
    const parsed = sessionHeadersSchema.parse(headers)
    return parsed['x-session-token']
  }

  // ── Sacola ──────────────────────────────────────────────────────────────

  app.get('/cart', async (request, reply) => {
    const storeId = request.store!.id
    const token = getSessionToken(request.headers)
    const items = await app.sessionStore.getCart(storeId, token)
    return reply.send({ items })
  })

  app.put('/cart', async (request, reply) => {
    const storeId = request.store!.id
    const token = getSessionToken(request.headers)
    const { items } = cartBodySchema.parse(request.body)
    await app.sessionStore.setCart(storeId, token, items)
    return reply.send({ items })
  })

  app.delete('/cart', async (request, reply) => {
    const storeId = request.store!.id
    const token = getSessionToken(request.headers)
    await app.sessionStore.deleteCart(storeId, token)
    return reply.status(204).send()
  })

  // ── Favoritos ───────────────────────────────────────────────────────────

  app.get('/favorites', async (request, reply) => {
    const storeId = request.store!.id
    const token = getSessionToken(request.headers)
    const productIds = await app.sessionStore.getFavorites(storeId, token)
    return reply.send({ productIds })
  })

  app.put('/favorites', async (request, reply) => {
    const storeId = request.store!.id
    const token = getSessionToken(request.headers)
    const { productIds } = favoritesBodySchema.parse(request.body)
    await app.sessionStore.setFavorites(storeId, token, productIds)
    return reply.send({ productIds })
  })

  app.delete('/favorites', async (request, reply) => {
    const storeId = request.store!.id
    const token = getSessionToken(request.headers)
    await app.sessionStore.deleteFavorites(storeId, token)
    return reply.status(204).send()
  })
}
