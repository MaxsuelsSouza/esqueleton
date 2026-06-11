// Contexto da loja nas rotas públicas — descobre qual loja o visitante está vendo.
// As rotas públicas vivem em /api/lojas/:slug/... — este plugin lê o :slug da URL,
// busca a loja no banco e anexa em request.store para a rota usar.
import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'

// Dados da loja anexados à requisição pública
export type StoreContext = {
  id: string
  slug: string
  name: string
}

declare module 'fastify' {
  interface FastifyRequest {
    // Preenchido pelo preHandler resolveStore nas rotas públicas
    store?: StoreContext
  }
  interface FastifyInstance {
    resolveStore: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

// Cada slug consultado fica guardado por 60 segundos — o catálogo público recebe
// muitas requisições seguidas da mesma loja e não precisa ir ao banco em todas
const CACHE_TTL_MS = 60_000
// Limite de lojas no cache — evita crescimento sem fim na memória
const CACHE_MAX_ENTRIES = 1000

const plugin: FastifyPluginAsync = async (app) => {
  const cache = new Map<string, { store: StoreContext | null; expiraEm: number }>()

  app.decorate('resolveStore', async (request: FastifyRequest, reply: FastifyReply) => {
    const { slug } = request.params as { slug?: string }

    // Slug fora do formato válido nem chega ao banco
    if (!slug || !/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(slug)) {
      return reply.status(404).send({ message: 'Loja não encontrada' })
    }

    const agora = Date.now()
    const emCache = cache.get(slug)
    let store: StoreContext | null

    if (emCache && emCache.expiraEm > agora) {
      store = emCache.store
    } else {
      const encontrada = await app.prisma.store.findUnique({ where: { slug } })
      // Loja suspensa se comporta como inexistente para o público
      store =
        encontrada && encontrada.status === 'ACTIVE'
          ? { id: encontrada.id, slug: encontrada.slug, name: encontrada.name }
          : null

      // Slugs inexistentes também ficam no cache — evita que tentativas repetidas
      // de slugs aleatórios virem consultas ao banco
      if (cache.size >= CACHE_MAX_ENTRIES) {
        // Remove a entrada mais antiga para abrir espaço
        const maisAntiga = cache.keys().next().value
        if (maisAntiga !== undefined) cache.delete(maisAntiga)
      }
      cache.set(slug, { store, expiraEm: agora + CACHE_TTL_MS })
    }

    if (!store) {
      return reply.status(404).send({ message: 'Loja não encontrada' })
    }

    request.store = store
  })
}

export const storeContextPlugin = fp(plugin)
