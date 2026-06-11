import type { FastifyPluginAsync } from 'fastify'
import { categorySchema } from './category.schema'
import { idParamSchema } from '../common/validation'

export const categoryRoutes: FastifyPluginAsync = async (app) => {
  // ── Rotas públicas ──────────────────────────────────────────────

  // Retorna todas as categorias em lista plana — o frontend monta a árvore com buildCategoryTree
  app.get('/', async () => {
    return app.prisma.category.findMany({ orderBy: { name: 'asc' } })
  })

  app.get('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const category = await app.prisma.category.findUnique({ where: { id } })
    if (!category) {
      return reply.status(404).send({ message: 'Categoria não encontrada' })
    }
    return category
  })

  // ── Rotas protegidas (requer JWT) ───────────────────────────────

  app.post(
    '/',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const data = categorySchema.parse(request.body)

      // Verifica se o pai existe quando informado
      if (data.parentId) {
        const parent = await app.prisma.category.findUnique({ where: { id: data.parentId } })
        if (!parent) {
          return reply.status(404).send({ message: 'Categoria pai não encontrada' })
        }
      }

      const category = await app.prisma.category.create({ data })
      return reply.status(201).send(category)
    }
  )

  app.put(
    '/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params)
      const data = categorySchema.partial().parse(request.body)

      // Impede que uma categoria seja definida como filha de si mesma
      if (data.parentId === id) {
        return reply.status(400).send({ message: 'Uma categoria não pode ser filha de si mesma' })
      }

      try {
        const category = await app.prisma.category.update({ where: { id }, data })
        return category
      } catch {
        return reply.status(404).send({ message: 'Categoria não encontrada' })
      }
    }
  )

  // Exclui a categoria e todas as suas subcategorias recursivamente
  app.delete(
    '/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params)

      const category = await app.prisma.category.findUnique({ where: { id } })
      if (!category) {
        return reply.status(404).send({ message: 'Categoria não encontrada' })
      }

      // Coleta todos os IDs descendentes para excluir em cascata
      const idsToDelete = await collectDescendantIds(id)

      // Exclui da folha para a raiz para respeitar as foreign keys
      for (const descendantId of idsToDelete.reverse()) {
        await app.prisma.category.delete({ where: { id: descendantId } })
      }

      return reply.status(204).send()
    }
  )

  // Coleta o ID da categoria e de todos os seus descendentes (BFS)
  async function collectDescendantIds(rootId: string): Promise<string[]> {
    const ids: string[] = [rootId]
    const queue: string[] = [rootId]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      const children = await app.prisma.category.findMany({
        where: { parentId: currentId },
        select: { id: true },
      })
      for (const child of children) {
        ids.push(child.id)
        queue.push(child.id)
      }
    }

    return ids
  }
}
