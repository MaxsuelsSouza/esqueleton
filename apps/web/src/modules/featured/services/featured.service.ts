// Operações relacionadas às seções em destaque do catálogo
import { apiClient } from '@/shared/services/api-client'
import type { Featured } from '@esqueleton/shared'

export const featuredService = {
  // ── Site público — retorna apenas destaques ativos da loja visitada ────────
  listPublicFeatured: (slug: string) =>
    apiClient.get<Featured[]>(`/lojas/${encodeURIComponent(slug)}/featured`),

  // ── Painel admin (requer login) ─────────────────────────────────────────────

  // Retorna todos os destaques da loja do administrador, inclusive desativados e agendados
  listFeatured: (token: string) => apiClient.get<Featured[]>('/featured', token),

  createFeatured: (data: Omit<Featured, 'id' | 'createdAt'>, token: string) =>
    apiClient.post<Featured>('/featured', data, token),

  updateFeatured: (id: string, data: Partial<Featured>, token: string) =>
    apiClient.put<Featured>(`/featured/${id}`, data, token),

  deleteFeatured: (id: string, token: string) =>
    apiClient.delete(`/featured/${id}`, token),
}
