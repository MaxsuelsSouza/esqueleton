// Todas as operações relacionadas a produtos do catálogo
import { apiClient } from './api-client'
import type { Product, ProductOption } from '@esqueleton/shared'

export interface ProductsPage {
  data: Product[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ProductsQuery {
  page?: number
  pageSize?: number
  search?: string
  // IDs já expandidos (incluindo subcategorias) separados por vírgula
  categoryIds?: string
  priceMin?: number | null
  priceMax?: number | null
  sortBy?: string
}

function buildQueryString(params: ProductsQuery): string {
  const q = new URLSearchParams()
  if (params.page && params.page > 1) q.set('page', String(params.page))
  if (params.pageSize) q.set('pageSize', String(params.pageSize))
  if (params.search) q.set('search', params.search)
  if (params.categoryIds) q.set('categoryIds', params.categoryIds)
  if (params.priceMin != null) q.set('priceMin', String(params.priceMin))
  if (params.priceMax != null) q.set('priceMax', String(params.priceMax))
  if (params.sortBy && params.sortBy !== 'newest') q.set('sortBy', params.sortBy)
  const qs = q.toString()
  return qs ? `?${qs}` : ''
}

export const catalogService = {
  // ── Site público — o slug identifica qual loja está sendo visitada ─────────

  // Busca produtos paginados da loja com filtros opcionais
  listPublicProducts: (slug: string, query: ProductsQuery = {}) =>
    apiClient.get<ProductsPage>(`/lojas/${encodeURIComponent(slug)}/products${buildQueryString(query)}`),

  // Busca produtos da loja por IDs específicos (seção em destaque e favoritos)
  getPublicProductsByIds: (slug: string, ids: string[]) =>
    apiClient.get<ProductsPage>(`/lojas/${encodeURIComponent(slug)}/products?ids=${ids.join(',')}`),

  // Busca um produto da loja pelo ID (página de detalhe)
  getPublicProduct: (slug: string, id: string) =>
    apiClient.get<Product>(`/lojas/${encodeURIComponent(slug)}/products/${id}`),

  // ── Painel admin — o token identifica a loja do administrador ──────────────

  // Busca produtos paginados com filtros opcionais (requer login)
  listProducts: (query: ProductsQuery, token: string) =>
    apiClient.get<ProductsPage>(`/products${buildQueryString(query)}`, token),

  // Lista enxuta (sem imagem) para os seletores de produto do admin — leve na memória
  listProductOptions: (token: string) =>
    apiClient.get<ProductOption[]>('/products/options', token),

  // Cria um novo produto (requer login)
  createProduct: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, token: string) =>
    apiClient.post<Product>('/products', data, token),

  // Atualiza um produto existente (requer login)
  updateProduct: (id: string, data: Partial<Product>, token: string) =>
    apiClient.put<Product>(`/products/${id}`, data, token),

  // Remove um produto (requer login)
  deleteProduct: (id: string, token: string) =>
    apiClient.delete(`/products/${id}`, token),
}
