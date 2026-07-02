// Operações de autenticação: login e cadastro
import { apiClient } from '@/shared/services/api-client'
import type { User, LoginResponse } from '@esqueleton/shared'

interface Credentials {
  email: string
  password: string
  name?: string
}

// Dados para criar uma loja nova junto com o primeiro usuário (cadastro público)
interface RegisterStoreInput {
  email: string
  password: string
  storeName: string
  storeSlug: string
  whatsapp: string
  // LGPD: aceite obrigatório dos Termos de Uso e da Política de Privacidade
  acceptedTerms: boolean
}

// Resposta do cadastro de loja nova — inclui o slug e o nome da loja criada
interface RegisterStoreResponse {
  id: string
  email: string
  storeId: string
  createdAt: string
  store: {
    slug: string
    name: string
  }
}

export const authService = {
  // Cria uma loja nova com o primeiro usuário (não exige login)
  registerStore: (data: RegisterStoreInput) =>
    apiClient.post<RegisterStoreResponse>('/auth/register', data),

  // Cria mais um usuário na mesma loja do administrador logado (exige token)
  register: (credentials: Credentials, token: string) =>
    apiClient.post<User>('/auth/register', credentials, token),

  // Faz login e retorna o token de acesso e os dados da loja
  login: (credentials: Credentials) =>
    apiClient.post<LoginResponse>('/auth/login', credentials),

  // Envia o link de redefinição de senha para o e-mail informado
  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>('/auth/forgot-password', { email }),

  // Redefine a senha usando o token recebido por e-mail
  resetPassword: (token: string, password: string) =>
    apiClient.post<{ message: string }>('/auth/reset-password', { token, password }),

  // Altera a própria senha (autenticado)
  // Se mustChangePassword = true, currentPassword não é necessário
  changePassword: (data: { currentPassword?: string; newPassword: string }, token: string) =>
    apiClient.put<{ message: string }>('/auth/change-password', data, token),
}
