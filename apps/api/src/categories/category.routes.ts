// Rotas de categorias — divididas em dois grupos:
//   - categoryPublicRoutes: leitura pelo catálogo público, a loja vem do slug na URL
//   - categoryAdminRoutes: gestão pelo painel, a loja vem do token JWT
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { categorySchema } from './category.schema'
import { idParamSchema } from '../common/validation'

// ── Rotas públicas — a loja vem do slug na URL ─────────────────────
export const categoryPublicRoutes: FastifyPluginAsync = async (app) => {
  // Retorna todas as categorias da loja em lista plana — o frontend monta a árvore com buildCategoryTree
  app.get('/', async (request) => {
    return app.prisma.category.findMany({
      where: { storeId: request.store!.id },
      orderBy: { name: 'asc' },
    })
  })

  app.get('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const category = await app.prisma.category.findFirst({
      where: { id, storeId: request.store!.id },
    })
    if (!category) {
      return reply.status(404).send({ message: 'Categoria não encontrada' })
    }
    return category
  })
}

// ── Rotas do admin — a loja vem do token JWT ───────────────────────
export const categoryAdminRoutes: FastifyPluginAsync = async (app) => {
  // Todas as rotas deste grupo exigem login
  app.addHook('preHandler', app.authenticate)

  app.get('/', async (request) => {
    return app.prisma.category.findMany({
      where: { storeId: request.user.storeId },
      orderBy: { name: 'asc' },
    })
  })

  app.get('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const category = await app.prisma.category.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!category) {
      return reply.status(404).send({ message: 'Categoria não encontrada' })
    }
    return category
  })

  app.post('/', async (request, reply) => {
    const storeId = request.user.storeId
    const data = categorySchema.parse(request.body)

    // Verifica se o pai existe E pertence a esta loja quando informado
    if (data.parentId) {
      const parent = await app.prisma.category.findFirst({
        where: { id: data.parentId, storeId },
      })
      if (!parent) {
        return reply.status(404).send({ message: 'Categoria pai não encontrada' })
      }
    }

    const category = await app.prisma.category.create({ data: { ...data, storeId } })
    return reply.status(201).send(category)
  })

  app.put('/:id', async (request, reply) => {
    const storeId = request.user.storeId
    const { id } = idParamSchema.parse(request.params)
    const data = categorySchema.partial().parse(request.body)

    // Impede que uma categoria seja definida como filha de si mesma
    if (data.parentId === id) {
      return reply.status(400).send({ message: 'Uma categoria não pode ser filha de si mesma' })
    }

    // O novo pai precisa existir e ser desta loja
    if (data.parentId) {
      const parent = await app.prisma.category.findFirst({
        where: { id: data.parentId, storeId },
      })
      if (!parent) {
        return reply.status(404).send({ message: 'Categoria pai não encontrada' })
      }
    }

    const { count } = await app.prisma.category.updateMany({ where: { id, storeId }, data })
    if (count === 0) {
      return reply.status(404).send({ message: 'Categoria não encontrada' })
    }
    return app.prisma.category.findFirst({ where: { id, storeId } })
  })

  // Exclui a categoria e todas as suas subcategorias recursivamente
  app.delete('/:id', async (request, reply) => {
    const storeId = request.user.storeId
    const { id } = idParamSchema.parse(request.params)

    const category = await app.prisma.category.findFirst({ where: { id, storeId } })
    if (!category) {
      return reply.status(404).send({ message: 'Categoria não encontrada' })
    }

    // Coleta todos os IDs descendentes para excluir em cascata
    const idsToDelete = await collectDescendantIds(app, id, storeId)

    // Exclui da folha para a raiz para respeitar as foreign keys
    for (const descendantId of idsToDelete.reverse()) {
      await app.prisma.category.deleteMany({ where: { id: descendantId, storeId } })
    }

    return reply.status(204).send()
  })
}

// Coleta o ID da categoria e de todos os seus descendentes (BFS) — sempre dentro da mesma loja
async function collectDescendantIds(app: FastifyInstance, rootId: string, storeId: string): Promise<string[]> {
  const ids: string[] = [rootId]
  const queue: string[] = [rootId]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    const children = await app.prisma.category.findMany({
      where: { parentId: currentId, storeId },
      select: { id: true },
    })
    for (const child of children) {
      ids.push(child.id)
      queue.push(child.id)
    }
  }

  return ids
}
