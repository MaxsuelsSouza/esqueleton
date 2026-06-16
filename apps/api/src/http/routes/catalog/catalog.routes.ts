// Rotas de produtos — divididas em dois grupos:
//   - catalogPublicRoutes: catálogo público, a loja vem do slug na URL (/api/lojas/:slug/products)
//   - catalogAdminRoutes: gestão pelo painel, a loja vem do token JWT (/api/products)
import type { FastifyPluginAsync } from 'fastify'
import { productSchema } from '../../schemas/catalog.schema'
import { idParamSchema } from '../../../shared/validation/schemas'
import { listarProdutos, toProductResponse, PRODUCT_INCLUDE, type ListQuery } from '../../../domain/catalog/services/product.service'

// ── Rotas públicas — a loja vem do slug na URL ─────────────────────
export const catalogPublicRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request) => {
    return listarProdutos(app.prisma,request.store!.id, request.query as ListQuery)
  })

  app.get('/:id', async (request, reply) => {
    // Valida o formato do ID recebido na URL antes de consultar o banco
    const { id } = idParamSchema.parse(request.params)
    const product = await app.prisma.product.findFirst({
      where: { id, storeId: request.store!.id },
      include: PRODUCT_INCLUDE,
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
    return listarProdutos(app.prisma,request.user.storeId, request.query as ListQuery)
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
      include: PRODUCT_INCLUDE,
    })
    if (!product) {
      return reply.status(404).send({ message: 'Produto não encontrado' })
    }
    return toProductResponse(product)
  })

  app.post('/', { preHandler: [app.checkPlanLimit('maxProducts')] }, async (request, reply) => {
    const storeId = request.user.storeId
    const { categoryIds, variants, ...fields } = productSchema.parse(request.body)

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
        variants: variants.length > 0 ? {
          create: variants.map((v) => ({
            options: v.options,
            price: v.price,
            imageUrl: v.imageUrl ?? null,
            active: v.active,
            storeId,
          })),
        } : undefined,
      },
      include: PRODUCT_INCLUDE,
    })

    return reply.status(201).send(toProductResponse(product))
  })

  app.put('/:id', async (request, reply) => {
    const storeId = request.user.storeId
    const { id } = idParamSchema.parse(request.params)
    const { categoryIds, variants, ...fields } = productSchema.partial().parse(request.body)

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

      // Recria as variantes (apaga todas e insere as novas)
      if (variants !== undefined) {
        await tx.productVariant.deleteMany({ where: { productId: id, storeId } })
        if (variants.length > 0) {
          await tx.productVariant.createMany({
            data: variants.map((v) => ({
              productId: id,
              options: v.options,
              price: v.price,
              imageUrl: v.imageUrl ?? null,
              active: v.active,
              storeId,
            })),
          })
        }
      }

      await tx.product.updateMany({ where: { id, storeId }, data: fields })
      return tx.product.findFirst({
        where: { id, storeId },
        include: PRODUCT_INCLUDE,
      })
    })

    if (!product) {
      return reply.status(404).send({ message: 'Produto não encontrado' })
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
