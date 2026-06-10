// Todas as operações relacionadas a produtos do catálogo
import { apiClient } from './api-client'
import type { Product } from '@esqueleton/shared'

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
  // Busca produtos paginados com filtros opcionais
  listProducts: (query: ProductsQuery = {}) =>
    apiClient.get<ProductsPage>(`/products${buildQueryString(query)}`),

  // Busca produtos por IDs específicos (usado para seção em destaque)
  getProductsByIds: (ids: string[]) =>
    apiClient.get<ProductsPage>(`/products?ids=${ids.join(',')}`),

  // Busca um produto pelo ID (público)
  getProduct: (id: string) => apiClient.get<Product>(`/products/${id}`),

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
