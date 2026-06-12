// Gestão de usuários da loja — usado na página "Equipe" (OWNER only)
import { apiClient } from './api-client'
import type { User } from '@esqueleton/shared'

export const usersService = {
  // Lista todos os usuários da loja do admin logado
  list: (token: string) =>
    apiClient.get<User[]>('/users', token),

  // Remove um usuário da equipe (não permite remover a si mesmo)
  delete: (id: string, token: string) =>
    apiClient.delete<void>(`/users/${id}`, token),
}
