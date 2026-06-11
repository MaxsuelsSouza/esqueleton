// Operações relacionadas às categorias do catálogo
import { apiClient } from './api-client'
import type { Category } from '@esqueleton/shared'

export const categoriesService = {
  // ── Site público — busca as categorias da loja visitada pelo slug ──────────
  listPublicCategories: (slug: string) =>
    apiClient.get<Category[]>(`/lojas/${encodeURIComponent(slug)}/categories`),

  // ── Painel admin (requer login) ─────────────────────────────────────────────

  // Busca todas as categorias da loja do administrador
  listCategories: (token: string) => apiClient.get<Category[]>('/categories', token),

  // Cria uma nova categoria
  createCategory: (data: { name: string; parentId: string | null }, token: string) =>
    apiClient.post<Category>('/categories', data, token),

  // Atualiza o nome de uma categoria
  updateCategory: (id: string, data: { name: string }, token: string) =>
    apiClient.put<Category>(`/categories/${id}`, data, token),

  // Remove uma categoria e suas subcategorias
  deleteCategory: (id: string, token: string) =>
    apiClient.delete(`/categories/${id}`, token),
}
