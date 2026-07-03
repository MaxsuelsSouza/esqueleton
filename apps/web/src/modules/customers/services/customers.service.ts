// Serviço de clientes — cadastro público na sacola e ferramentas do painel
// para o lojista atender os direitos dos clientes dele (art. 18 da LGPD)
import { apiClient } from '@/shared/services/api-client'
import type { Customer } from '@esqueleton/shared'

// Pacote de portabilidade retornado pela exportação de um cliente
export interface CustomerExport {
  exportadoEm: string
  cliente: {
    id: string
    nome: string
    telefone: string
    cadastradoEm: string
    atualizadoEm: string
  }
  pedidos: unknown[]
}

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

  // Lista os clientes da loja do admin logado
  list: (token: string) => apiClient.get<Customer[]>('/customers', token),

  // Corrige nome e/ou telefone de um cliente (retificação — art. 18, III)
  update: (id: string, data: { name?: string; phone?: string }, token: string) =>
    apiClient.put<Customer>(`/customers/${id}`, data, token),

  // Exporta cadastro + pedidos de um cliente (portabilidade — art. 18, V)
  exportData: (id: string, token: string) =>
    apiClient.get<CustomerExport>(`/customers/${id}/export`, token),

  // Exclui o cadastro (eliminação — art. 18, VI); opcionalmente anonimiza
  // nome/telefone nos pedidos do cliente, mantendo os valores para estatística
  remove: (id: string, anonimizarPedidos: boolean, token: string) =>
    apiClient.delete<void>(`/customers/${id}?anonimizarPedidos=${anonimizarPedidos}`, token),
}
