// Rotas de produtos — divididas em dois grupos:
//   - catalogPublicRoutes: catálogo público, a loja vem do slug na URL (/api/lojas/:slug/products)
//   - catalogAdminRoutes: gestão pelo painel, a loja vem do token JWT (/api/products)
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { productSchema } from './catalog.schema'
import { idParamSchema } from '../common/validation'

const PAGE_SIZE = 20

// Transforma o produto do formato Prisma (com relação categories) para o formato do tipo compartilhado (com categoryIds)
function toProductResponse(product: { categories: { categoryId: string }[]; [key: string]: unknown }) {
  const { categories, ...rest } = product
  return { ...rest, categoryIds: categories.map((c) => c.categoryId) }
}

// Parâmetros aceitos na query string da listagem
type ListQuery = {
  page?: string
  pageSize?: string
  search?: string
  categoryIds?: string   // IDs separados por vírgula
  ids?: string           // Busca por IDs específicos (usado para seção em destaque)
  priceMin?: string
  priceMax?: string
  sortBy?: string
}

// Listagem paginada com filtros — usada tanto pelo catálogo público quanto pelo admin.
// O storeId garante que apenas os produtos daquela loja apareçam.
async function listarProdutos(app: FastifyInstance, storeId: string, query: ListQuery) {
  // Busca por IDs específicos — ignora paginação e filtros
  // Limitado a 100 IDs e apenas no formato válido, para evitar consultas montadas por terceiros
  if (query.ids) {
    const ids = query.ids
      .split(',')
      .filter((id) => /^[A-Za-z0-9_-]{1,64}$/.test(id))
      .slice(0, 100)
    const products = await app.prisma.product.findMany({
      where: { id: { in: ids }, storeId },
      include: { categories: { select: { categoryId: true } } },
    })
    return { data: products.map(toProductResponse), total: products.length, page: 1, pageSize: ids.length, totalPages: 1 }
  }

  // "|| 1" e "|| PAGE_SIZE" cobrem valores não numéricos (ex: ?page=abc), que viravam NaN e quebravam a consulta
  const page = Math.max(1, Math.floor(Number(query.page) || 1))
  const pageSize = Math.min(Math.max(1, Math.floor(Number(query.pageSize) || PAGE_SIZE)), 500)
  const skip = (page - 1) * pageSize

  // Monta o filtro do Prisma conforme os parâmetros recebidos — sempre limitado à loja
  const where: Record<string, unknown> = { storeId }

  // Texto de busca limitado a 200 caracteres — evita consultas pesadas com textos gigantes
  const search = query.search?.trim().slice(0, 200)
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
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
    query.sortBy === 'name'       ? { name: 'asc' as const } :
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
}

// ── Rotas públicas — a loja vem do slug na URL ─────────────────────
export const catalogPublicRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request) => {
    return listarProdutos(app, request.store!.id, request.query as ListQuery)
  })

  app.get('/:id', async (request, reply) => {
    // Valida o formato do ID recebido na URL antes de consultar o banco
    const { id } = idParamSchema.parse(request.params)
    const product = await app.prisma.product.findFirst({
      where: { id, storeId: request.store!.id },
      include: { categories: { select: { categoryId: true } } },
    })
    if (!product) {
      return reply.status(404).send({ message: 'Produto não encontrado' })
    }
    return toProductResponse(product)
  })
}

// ── Rotas do admin — a loja vem do token JWT ───────────────────────
export const catalogAdminRoutes: FastifyPluginAsync = async (app) => {
  // Todas as rotas deste grupo exigem login
  app.addHook('preHandler', app.authenticate)

  app.get('/', async (request) => {
    return listarProdutos(app, request.user.storeId, request.query as ListQuery)
  })

  // Lista enxuta para os seletores do admin (cupons, promoções, destaques).
  // Retorna apenas id, nome, marca, preço e categorias — sem a imagem, que pode ser
  // grande (base64) e tornaria a listagem de centenas de produtos pesada na memória.
  app.get('/options', async (request) => {
    const products = await app.prisma.product.findMany({
      where: { storeId: request.user.storeId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        brand: true,
        price: true,
        categories: { select: { categoryId: true } },
      },
    })
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand ?? undefined,
      price: p.price,
      categoryIds: p.categories.map((c) => c.categoryId),
    }))
  })

  app.get('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const product = await app.prisma.product.findFirst({
      where: { id, storeId: request.user.storeId },
      include: { categories: { select: { categoryId: true } } },
    })
    if (!product) {
      return reply.status(404).send({ message: 'Produto não encontrado' })
    }
    return toProductResponse(product)
  })

  app.post('/', async (request, reply) => {
    const storeId = request.user.storeId
    const { categoryIds, ...fields } = productSchema.parse(request.body)

    // Confere que todas as categorias informadas pertencem a esta loja
    if (categoryIds.length > 0) {
      const totalValidas = await app.prisma.category.count({
        where: { id: { in: categoryIds }, storeId },
      })
      if (totalValidas !== categoryIds.length) {
        return reply.status(400).send({ message: 'Uma ou mais categorias não existem' })
      }
    }

    const product = await app.prisma.product.create({
      data: {
        ...fields,
        storeId,
        categories: {
          create: categoryIds.map((categoryId) => ({ categoryId })),
        },
      },
      include: { categories: { select: { categoryId: true } } },
    })

    return reply.status(201).send(toProductResponse(product))
  })

  app.put('/:id', async (request, reply) => {
    const storeId = request.user.storeId
    const { id } = idParamSchema.parse(request.params)
    const { categoryIds, ...fields } = productSchema.partial().parse(request.body)

    // Confere que o produto pertence a esta loja antes de alterar qualquer coisa
    const existente = await app.prisma.product.findFirst({
      where: { id, storeId },
      select: { id: true },
    })
    if (!existente) {
      return reply.status(404).send({ message: 'Produto não encontrado' })
    }

    // Confere que todas as categorias informadas pertencem a esta loja
    if (categoryIds !== undefined && categoryIds.length > 0) {
      const totalValidas = await app.prisma.category.count({
        where: { id: { in: categoryIds }, storeId },
      })
      if (totalValidas !== categoryIds.length) {
        return reply.status(400).send({ message: 'Uma ou mais categorias não existem' })
      }
    }

    const product = await app.prisma.$transaction(async (tx) => {
      if (categoryIds !== undefined) {
        await tx.productCategory.deleteMany({ where: { productId: id } })
        await tx.productCategory.createMany({
          data: categoryIds.map((categoryId) => ({ productId: id, categoryId })),
        })
      }

      await tx.product.updateMany({ where: { id, storeId }, data: fields })
      return tx.product.findFirst({
        where: { id, storeId },
        include: { categories: { select: { categoryId: true } } },
      })
    })

    if (!product) {
      return reply.status(404).send({ message: 'Produto não encontrado' })
    }

    // Verifica estoque após a atualização e cria notificação se necessário — fire and forget
    const stock = product.stock
    if (stock !== null && stock !== undefined) {
      const productName = product.brand ? `${product.brand} ${product.name}` : product.name
      if (stock === 0) {
        // Upsert: cria a notificação ou reativa caso o admin já tivesse marcado como lida
        app.prisma.notification.upsert({
          where: { storeId_type_entityId: { storeId, type: 'OUT_OF_STOCK', entityId: product.id } },
          create: { storeId, type: 'OUT_OF_STOCK', title: `"${productName}" está sem estoque`, entityId: product.id },
          update: { status: 'PENDING', createdAt: new Date() },
        }).catch(() => {})
      } else if (stock < 3) {
        app.prisma.notification.upsert({
          where: { storeId_type_entityId: { storeId, type: 'LOW_STOCK', entityId: product.id } },
          create: { storeId, type: 'LOW_STOCK', title: `"${productName}" com estoque baixo`, body: `Restam ${stock} unidade${stock === 1 ? '' : 's'}`, entityId: product.id },
          update: { status: 'PENDING', body: `Restam ${stock} unidade${stock === 1 ? '' : 's'}`, createdAt: new Date() },
        }).catch(() => {})
      }
    }

    return toProductResponse(product)
  })

  app.delete('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    // deleteMany com id + storeId: só apaga se o produto for desta loja
    const { count } = await app.prisma.product.deleteMany({
      where: { id, storeId: request.user.storeId },
    })
    if (count === 0) {
      return reply.status(404).send({ message: 'Produto não encontrado' })
    }
    return reply.status(204).send()
  })
}
