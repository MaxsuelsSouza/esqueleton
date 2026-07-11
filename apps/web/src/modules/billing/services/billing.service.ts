// Planos e assinatura — usado na página "Plano" do admin
import { apiClient } from '@/shared/services/api-client'
import type { Plan, BillingCurrentResponse, SubscribeResponse, InvoicesResponse } from '@esqueleton/shared'

export const billingService = {
  // Lista os planos disponíveis (público — também serve para página de preços)
  listPlans: () =>
    apiClient.get<Plan[]>('/billing/plans'),

  // Assinatura atual da loja com o plano e o uso (produtos, usuários, pedidos do mês)
  current: (token: string) =>
    apiClient.get<BillingCurrentResponse>('/billing/current', token),

  // Assina ou troca para um plano — em planos pagos retorna a URL de checkout do Stripe
  subscribe: (planId: string, token: string) =>
    apiClient.post<SubscribeResponse>('/billing/subscribe', { planId }, token),

  // Cancela a assinatura paga e volta ao plano gratuito
  cancel: (token: string) =>
    apiClient.post<{ message: string }>('/billing/cancel', {}, token),

  // Histórico de faturas — startingAfter é o ID da última fatura já carregada
  // (paginação por cursor do Stripe para o botão "Carregar mais")
  listInvoices: (token: string, startingAfter?: string) =>
    apiClient.get<InvoicesResponse>(
      startingAfter ? `/billing/invoices?startingAfter=${encodeURIComponent(startingAfter)}` : '/billing/invoices',
      token,
    ),
}
