import type { FastifyPluginAsync } from 'fastify'
import { productSchema } from './catalog.schema'
import { idParamSchema } from '../common/validation'

const PAGE_SIZE = 20

// Transforma o produto do formato Prisma (com relação categories) para o formato do tipo compartilhado (com categoryIds)
function toProductResponse(product: { categories: { categoryId: string }[]; [key: string]: unknown }) {
  const { categories, ...rest } = product
  return { ...rest, categoryIds: categories.map((c) => c.categoryId) }
}

export const catalogRoutes: FastifyPluginAsync = async (app) => {
  // ── Rotas públicas ──────────────────────────────────────────────

  // Listagem paginada com filtros opcionais por query string
  app.get('/', async (request) => {
    const query = request.query as {
      page?: string
      pageSize?: string
      search?: string
      categoryIds?: string   // IDs separados por vírgula
      ids?: string           // Busca por IDs específicos (usado para seção em destaque)
      priceMin?: string
      priceMax?: string
      sortBy?: string
    }

    // Busca por IDs específicos — ignora paginação e filtros
    // Limitado a 100 IDs e apenas no formato válido, para evitar consultas montadas por terceiros
    if (query.ids) {
      const ids = query.ids
        .split(',')
        .filter((id) => /^[A-Za-z0-9_-]{1,64}$/.test(id))
        .slice(0, 100)
      const products = await app.prisma.product.findMany({
        where: { id: { in: ids } },
        include: { categories: { select: { categoryId: true } } },
      })
      return { data: products.map(toProductResponse), total: products.length, page: 1, pageSize: ids.length, totalPages: 1 }
    }

    // "|| 1" e "|| PAGE_SIZE" cobrem valores não numéricos (ex: ?page=abc), que viravam NaN e quebravam a consulta
    const page = Math.max(1, Math.floor(Number(query.page) || 1))
    const pageSize = Math.min(Math.max(1, Math.floor(Number(query.pageSize) || PAGE_SIZE)), 500)
    const skip = (page - 1) * pageSize

    // Monta o filtro do Prisma conforme os parâmetros recebidos
    const where: Record<string, unknown> = {}

    // Texto de busca limitado a 200 caracteres — evita consultas pesadas com textos gigantes
    const search = query.search?.trim().slice(0, 200)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (query.categoryIds) {
      // Aceita apenas IDs no formato válido, limitados a 100
      const ids = query.categoryIds
        .split(',')
        .filter((id) => /^[A-Za-z0-9_-]{1,64}$/.test(id))
        .slice(0, 100)
      if (ids.length > 0) {
        where.categories = { some: { categoryId: { in: ids } } }
      }
    }

    // Filtros de preço — ignora valores não numéricos (ex: ?priceMin=abc), que quebravam a consulta
    const priceMin = Number(query.priceMin)
    const priceMax = Number(query.priceMax)
    if (query.priceMin && Number.isFinite(priceMin)) where.price = { ...(where.price as object ?? {}), gte: priceMin }
    if (query.priceMax && Number.isFinite(priceMax)) where.price = { ...(where.price as object ?? {}), lte: priceMax }

    const orderBy =
      query.sortBy === 'price-asc'  ? { price: 'asc' as const } :
      query.sortBy === 'price-desc' ? { price: 'desc' as const } :
      { createdAt: 'desc' as const }

    const [products, total] = await Promise.all([
      app.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: { categories: { select: { categoryId: true } } },
      }),
      app.prisma.product.count({ where }),
    ])

    return {
      data: products.map(toProductResponse),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  })

  app.get('/:id', async (request, reply) => {
    // Valida o formato do ID recebido na URL antes de consultar o banco
    const { id } = idParamSchema.parse(request.params)
    const product = await app.prisma.product.findUnique({
      where: { id },
      include: { categories: { select: { categoryId: true } } },
    })
    if (!product) {
      return reply.status(404).send({ message: 'Produto não encontrado' })
    }
    return toProductResponse(product)
  })

  // ── Rotas protegidas (requer JWT) ───────────────────────────────

  app.post(
    '/',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { categoryIds, ...fields } = productSchema.parse(request.body)

      const product = await app.prisma.product.create({
        data: {
          ...fields,
          categories: {
            create: categoryIds.map((categoryId) => ({ categoryId })),
          },
        },
        include: { categories: { select: { categoryId: true } } },
      })

      return reply.status(201).send(toProductResponse(product))
    }
  )

  app.put(
    '/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params)
      const { categoryIds, ...fields } = productSchema.partial().parse(request.body)

      try {
        const product = await app.prisma.$transaction(async (tx) => {
          if (categoryIds !== undefined) {
            await tx.productCategory.deleteMany({ where: { productId: id } })
            await tx.productCategory.createMany({
              data: categoryIds.map((categoryId) => ({ productId: id, categoryId })),
            })
          }

          return tx.product.update({
            where: { id },
            data: fields,
            include: { categories: { select: { categoryId: true } } },
          })
        })

        // Verifica estoque após a atualização e cria notificação se necessário — fire and forget
        const stock = product.stock
        if (stock !== null && stock !== undefined) {
          const productName = product.brand ? `${product.brand} ${product.name}` : product.name
          if (stock === 0) {
            // Upsert: cria a notificação ou reativa caso o admin já tivesse marcado como lida
            app.prisma.notification.upsert({
              where: { type_entityId: { type: 'OUT_OF_STOCK', entityId: product.id } },
              create: { type: 'OUT_OF_STOCK', title: `"${productName}" está sem estoque`, entityId: product.id },
              update: { status: 'PENDING', createdAt: new Date() },
            }).catch(() => {})
          } else if (stock < 3) {
            app.prisma.notification.upsert({
              where: { type_entityId: { type: 'LOW_STOCK', entityId: product.id } },
              create: { type: 'LOW_STOCK', title: `"${productName}" com estoque baixo`, body: `Restam ${stock} unidade${stock === 1 ? '' : 's'}`, entityId: product.id },
              update: { status: 'PENDING', body: `Restam ${stock} unidade${stock === 1 ? '' : 's'}`, createdAt: new Date() },
            }).catch(() => {})
          }
        }

        return toProductResponse(product)
      } catch {
        return reply.status(404).send({ message: 'Produto não encontrado' })
      }
    }
  )

  app.delete(
    '/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params)
      try {
        await app.prisma.product.delete({ where: { id } })
        return reply.status(204).send()
      } catch {
        return reply.status(404).send({ message: 'Produto não encontrado' })
      }
    }
  )
}
