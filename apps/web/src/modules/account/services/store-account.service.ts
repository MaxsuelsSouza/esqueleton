// Serviço da conta/loja — direitos do lojista sobre os próprios dados (LGPD):
// exportação completa (portabilidade) e exclusão definitiva da loja
import { apiClient } from '@/shared/services/api-client'

export const storeAccountService = {
  // Baixa todos os dados da loja em JSON (OWNER only)
  exportStore: (token: string) => apiClient.get<Record<string, unknown>>('/store/export', token),

  // Exclui a loja definitivamente — exige a senha atual como confirmação (OWNER only)
  deleteStore: (password: string, token: string) =>
    apiClient.delete<void>('/store', token, { password }),
}
