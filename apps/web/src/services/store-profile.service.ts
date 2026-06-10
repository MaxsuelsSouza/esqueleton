// Operações relacionadas ao perfil da loja
import { apiClient } from './api-client'
import type { StoreProfile } from '@esqueleton/shared'

export const storeProfileService = {
  getProfile: () => apiClient.get<StoreProfile>('/store-profile'),

  updateProfile: (data: Omit<StoreProfile, 'id' | 'updatedAt'>, token: string) =>
    apiClient.put<StoreProfile>('/store-profile', data, token),
}
