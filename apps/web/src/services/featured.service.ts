// Operações relacionadas às seções em destaque do catálogo
import { apiClient } from './api-client'
import type { Featured } from '@esqueleton/shared'

export const featuredService = {
  listFeatured: () => apiClient.get<Featured[]>('/featured'),

  createFeatured: (data: Omit<Featured, 'id' | 'createdAt'>, token: string) =>
    apiClient.post<Featured>('/featured', data, token),

  updateFeatured: (id: string, data: Partial<Featured>, token: string) =>
    apiClient.put<Featured>(`/featured/${id}`, data, token),

  deleteFeatured: (id: string, token: string) =>
    apiClient.delete(`/featured/${id}`, token),
}
