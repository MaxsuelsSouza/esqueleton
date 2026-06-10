// Serviço de clientes — salva nome e telefone coletados na sacola
import { apiClient } from './api-client'
import type { Customer } from '@esqueleton/shared'

export const customersService = {
  // Cria ou atualiza o cliente pelo telefone — fire and forget, nunca bloqueia o usuário
  async upsert(name: string, phone: string): Promise<void> {
    try {
      await apiClient.post<Customer>('/customers', { name, phone })
    } catch {
      // Falha silenciosa — o registro nunca deve bloquear o envio do pedido
    }
  },
}
