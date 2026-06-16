// Serviço de clientes — salva nome e telefone coletados na sacola
import { apiClient } from '@/shared/services/api-client'
import type { Customer } from '@esqueleton/shared'

export const customersService = {
  // Cria ou atualiza o cliente da loja visitada (slug) pelo telefone —
  // fire and forget, nunca bloqueia o usuário
  async upsert(slug: string, name: string, phone: string): Promise<void> {
    try {
      await apiClient.post<Customer>(`/lojas/${encodeURIComponent(slug)}/customers`, { name, phone })
    } catch {
      // Falha silenciosa — o registro nunca deve bloquear o envio do pedido
    }
  },
}
