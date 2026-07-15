// Rotas de produtos — divididas em dois grupos:
//   - catalogPublicRoutes: catálogo público, a loja vem do slug na URL (/api/lojas/:slug/products)
//   - catalogAdminRoutes: gestão pelo painel, a loja vem do token JWT (/api/products)
import type { FastifyPluginAsync } from 'fastify'
import { productSchema } from '../../schemas/catalog.schema'
import { idParamSchema } from '../../../shared/validation/schemas'
import { listarProdutos, toProductResponse, PRODUCT_INCLUDE, type ListQuery } from '../../../domain/catalog/services/product.service'
import { syncProductToWhatsApp, removeProductFromWhatsApp } from '../../../domain/catalog/services/whatsapp-sync.service'
import { uploadImage, uploadImages } from '../../../shared/storage/image-upload.service'
import { buildR2Prefix } from '../../../shared/storage/r2-key'

// ── Rotas públicas — a loja vem do slug na URL ─────────────────────
export const catalogPublicRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request) => {
    return listarProdutos(app.prisma, request.store!.id, request.query as ListQuery, { publicOnly: true })
  })

  app.get('/:id', async (request, reply) => {
    // Valida o formato do ID recebido na URL antes de consultar o banco
    const { id } = idParamSchema.parse(request.params)
    const product = await app.prisma.product.findFirst({
      where: { id, storeId: request.store!.id, isAvailable: true },
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

  // Listagem enxuta — a tabela do painel só precisa de nome, marca, foto e preço.
  // As variantes, fotos adicionais e características só carregam ao abrir a edição.
  app.get('/', async (request) => {
    return listarProdutos(app.prisma, request.user.storeId, request.query as ListQuery, { summary: true })
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

    // Cria o produto primeiro (sem imagens) para ter o ID usado nas keys do R2
    const product = await app.prisma.product.create({
      data: {
        ...fields,
        imageUrl: undefined,
        images: [],
        storeId,
        categories: {
          create: categoryIds.map((categoryId) => ({ categoryId })),
        },
      },
      include: PRODUCT_INCLUDE,
    })

    // Faz upload das imagens para o R2 (ou mantém base64 em dev)
    const imageUrl = await uploadImage(app.storage, request.log, fields.imageUrl, storeId, 'products', product.id)
    const images = await uploadImages(app.storage, request.log, fields.images, storeId, 'products', product.id)

    // Faz upload das imagens das variantes e cria as variantes
    if (variants.length > 0) {
      const variantsData = await Promise.all(
        variants.map(async (v) => ({
          productId: product.id,
          options: v.options,
          price: v.price,
          imageUrl: (await uploadImage(app.storage, request.log, v.imageUrl, storeId, 'products', product.id)) ?? null,
          active: v.active,
          storeId,
        })),
      )
      await app.prisma.productVariant.createMany({ data: variantsData })
    }

    // Atualiza o produto com as URLs das imagens
    if (imageUrl || (images && images.length > 0)) {
      await app.prisma.product.updateMany({
        where: { id: product.id, storeId },
        data: {
          ...(imageUrl ? { imageUrl } : {}),
          ...(images && images.length > 0 ? { images } : {}),
        },
      })
    }

    // Recarrega o produto completo com as URLs atualizadas
    const updated = await app.prisma.product.findFirst({
      where: { id: product.id, storeId },
      include: PRODUCT_INCLUDE,
    })

    // Sincroniza com o catálogo do WhatsApp (fire-and-forget — não bloqueia a resposta)
    syncProductToWhatsApp(app.prisma, app.whatsappCatalog, app.log, storeId, product.id).catch(() => {})

    return reply.status(201).send(toProductResponse(updated!))
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

    // Faz upload das imagens para o R2 antes da transação.
    // null significa "limpar a imagem" — passa direto para o banco sem upload.
    if (fields.imageUrl != null) {
      fields.imageUrl = await uploadImage(app.storage, request.log, fields.imageUrl, storeId, 'products', id)
    }
    if (fields.images !== undefined) {
      fields.images = (await uploadImages(app.storage, request.log, fields.images, storeId, 'products', id)) ?? []
    }

    const product = await app.prisma.$transaction(async (tx) => {
      if (categoryIds !== undefined) {
        await tx.productCategory.deleteMany({ where: { productId: id } })
        await tx.productCategory.createMany({
          data: categoryIds.map((categoryId) => ({ productId: id, categoryId })),
        })
      }

      // Atualiza as variantes preservando os IDs existentes — sacolas de clientes
      // guardam o variantId por dias; recriar tudo deixaria esses IDs órfãos e a
      // sacola voltaria a cobrar o preço base do produto em vez do preço da variante
      if (variants !== undefined) {
        const existentes = await tx.productVariant.findMany({
          where: { productId: id, storeId },
          select: { id: true },
        })
        const idsExistentes = new Set(existentes.map((v) => v.id))
        const idsMantidos = variants
          .filter((v) => v.id && idsExistentes.has(v.id))
          .map((v) => v.id!)

        // Remove apenas as variantes que saíram do formulário
        await tx.productVariant.deleteMany({
          where: { productId: id, storeId, id: { notIn: idsMantidos } },
        })

        for (const v of variants) {
          const variantImageUrl =
            (await uploadImage(app.storage, request.log, v.imageUrl, storeId, 'products', id)) ?? null
          const dadosDaVariante = {
            options: v.options,
            price: v.price,
            imageUrl: variantImageUrl,
            active: v.active,
          }
          if (v.id && idsExistentes.has(v.id)) {
            await tx.productVariant.updateMany({
              where: { id: v.id, productId: id, storeId },
              data: dadosDaVariante,
            })
          } else {
            await tx.productVariant.create({
              data: { ...dadosDaVariante, productId: id, storeId },
            })
          }
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

    // Sincroniza com o catálogo do WhatsApp (fire-and-forget)
    syncProductToWhatsApp(app.prisma, app.whatsappCatalog, app.log, storeId, product.id).catch(() => {})

    return toProductResponse(product)
  })

  app.delete('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const storeId = request.user.storeId
    // deleteMany com id + storeId: só apaga se o produto for desta loja
    const { count } = await app.prisma.product.deleteMany({
      where: { id, storeId },
    })
    if (count === 0) {
      return reply.status(404).send({ message: 'Produto não encontrado' })
    }

    // Remove do catálogo do WhatsApp (fire-and-forget)
    removeProductFromWhatsApp(app.prisma, app.whatsappCatalog, app.log, request.user.storeId, id).catch(() => {})

    // Remove as imagens do R2 (fire-and-forget — não bloqueia a resposta)
    if (app.storage) {
      const prefix = buildR2Prefix(storeId, 'products', id)
      app.storage.deleteByPrefix(prefix).catch((err) => {
        request.log.warn({ err, prefix }, 'Falha ao limpar imagens do R2')
      })
    }

    return reply.status(204).send()
  })
}
