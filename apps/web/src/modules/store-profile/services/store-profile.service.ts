// Operações relacionadas ao perfil da loja
import { apiClient } from '@/shared/services/api-client'
import type { StoreProfile, WhatsAppCatalogStatus } from '@esqueleton/shared'

export const storeProfileService = {
  // ── Site público — busca o perfil da loja visitada pelo slug ───────────────
  getPublicProfile: (slug: string) =>
    apiClient.get<StoreProfile>(`/lojas/${encodeURIComponent(slug)}/store-profile`),

  // ── Painel admin (requer login) ─────────────────────────────────────────────

  // Busca o perfil da loja do administrador
  getProfile: (token: string) => apiClient.get<StoreProfile>('/store-profile', token),

  // O campo metaAccessToken é write-only: enviado no update, mas nunca devolvido pela API
  updateProfile: (
    data: Partial<Omit<StoreProfile, 'id' | 'updatedAt'>> & { metaAccessToken?: string | null },
    token: string,
  ) => apiClient.put<StoreProfile>('/store-profile', data, token),

  // Remove as credenciais da Meta e desativa a sincronização (revogação pelo painel)
  disconnectWhatsAppCatalog: (token: string) =>
    apiClient.put<StoreProfile>(
      '/store-profile',
      { metaAccessToken: null, metaWabaId: null, metaCatalogId: null, whatsappCatalogEnabled: false },
      token,
    ),

  // Retorna o progresso do onboarding (checklist do primeiro acesso)
  getOnboardingStatus: (token: string) =>
    apiClient.get<{ whatsapp: boolean; logo: boolean; hasProducts: boolean }>(
      '/store-profile/onboarding-status',
      token,
    ),

  // ── Integração com catálogo do WhatsApp Business ──────────────────

  // Testa a conexão com a Meta Catalog API (valida token + catalog ID)
  testWhatsAppConnection: (token: string) =>
    apiClient.post<{ ok: boolean; error?: string }>('/store-profile/whatsapp-test', {}, token),

  // Retorna o status da sincronização com o catálogo do WhatsApp
  getWhatsAppStatus: (token: string) =>
    apiClient.get<WhatsAppCatalogStatus>('/store-profile/whatsapp-status', token),

  // Sincroniza todos os produtos com o catálogo do WhatsApp (lote completo)
  syncWhatsAppCatalog: (token: string) =>
    apiClient.post<{ synced: number; failed: number; skipped: number; total: number; errors: string[] }>(
      '/store-profile/whatsapp-sync',
      {},
      token,
    ),
}
