// Operações relacionadas ao perfil da loja
import { apiClient } from '@/shared/services/api-client'
import type { StoreProfile } from '@esqueleton/shared'

export const storeProfileService = {
  // ── Site público — busca o perfil da loja visitada pelo slug ───────────────
  getPublicProfile: (slug: string) =>
    apiClient.get<StoreProfile>(`/lojas/${encodeURIComponent(slug)}/store-profile`),

  // ── Painel admin (requer login) ─────────────────────────────────────────────

  // Busca o perfil da loja do administrador
  getProfile: (token: string) => apiClient.get<StoreProfile>('/store-profile', token),

  updateProfile: (data: Partial<Omit<StoreProfile, 'id' | 'updatedAt'>>, token: string) =>
    apiClient.put<StoreProfile>('/store-profile', data, token),

  // Retorna o progresso do onboarding (checklist do primeiro acesso)
  getOnboardingStatus: (token: string) =>
    apiClient.get<{ whatsapp: boolean; logo: boolean; hasProducts: boolean }>(
      '/store-profile/onboarding-status',
      token,
    ),
}
