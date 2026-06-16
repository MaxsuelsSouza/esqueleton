// Lógica de negócio de produtos — listagem paginada com filtros e transformação de resposta
import type { PrismaClient } from '@prisma/client'

const PAGE_SIZE = 20

// Campos incluídos nas consultas que retornam produto completo (com variantes)
export const PRODUCT_INCLUDE = {
  categories: { select: { categoryId: true } },
  variants: {
    select: {
      id: true,
      options: true,
      price: true,
      imageUrl: true,
      active: true,
    },
  },
} as const

// Transforma o produto do formato Prisma (com relação categories e variants) para o formato do tipo compartilhado
export function toProductResponse(product: {
  categories: { categoryId: string }[]
  variants?: { id: string; options: unknown; price: number; imageUrl: string | null; active: boolean }[]
  characteristics?: unknown
  images?: string[]
  [key: string]: unknown
}) {
  const { categories, characteristics, variants, images, ...rest } = product
  return {
    ...rest,
    categoryIds: categories.map((c) => c.categoryId),
    // Fotos adicionais — retorna apenas quando preenchidas
    ...(Array.isArray(images) && images.length > 0 ? { images } : {}),
    // Características armazenadas como JSON — retorna apenas quando preenchidas
    ...(Array.isArray(characteristics) && characteristics.length > 0 ? { characteristics } : {}),
    // Variantes — retorna apenas quando existem
    ...(Array.isArray(variants) && variants.length > 0 ? { variants } : {}),
  }
}

// Parâmetros aceitos na query string da listagem
export type ListQuery = {
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
export async function listarProdutos(prisma: PrismaClient, storeId: string, query: ListQuery) {
  // Busca por IDs específicos — ignora paginação e filtros
  // Limitado a 100 IDs e apenas no formato válido, para evitar consultas montadas por terceiros
  if (query.ids) {
    const ids = query.ids
      .split(',')
      .filter((id) => /^[A-Za-z0-9_-]{1,64}$/.test(id))
      .slice(0, 100)
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, storeId },
      include: PRODUCT_INCLUDE,
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
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: PRODUCT_INCLUDE,
    }),
    prisma.product.count({ where }),
  ])

  return {
    data: products.map(toProductResponse),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
