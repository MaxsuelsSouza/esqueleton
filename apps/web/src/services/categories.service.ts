// Operações relacionadas às categorias do catálogo
import { apiClient } from './api-client'
import type { Category } from '@esqueleton/shared'

export const categoriesService = {
  // Busca todas as categorias em formato de árvore (público)
  listCategories: () => apiClient.get<Category[]>('/categories'),

  // Cria uma nova categoria (requer login)
  createCategory: (data: { name: string; parentId: string | null }, token: string) =>
    apiClient.post<Category>('/categories', data, token),

  // Atualiza o nome de uma categoria (requer login)
  updateCategory: (id: string, data: { name: string }, token: string) =>
    apiClient.put<Category>(`/categories/${id}`, data, token),

  // Remove uma categoria e suas subcategorias (requer login)
  deleteCategory: (id: string, token: string) =>
    apiClient.delete(`/categories/${id}`, token),
}
