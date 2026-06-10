// Operações de autenticação: login e cadastro
import { apiClient } from './api-client'
import type { User } from '@esqueleton/shared'

interface Credentials {
  email: string
  password: string
}

interface LoginResponse {
  token: string
}

export const authService = {
  // Cria uma nova conta de usuário
  register: (credentials: Credentials) =>
    apiClient.post<User>('/auth/register', credentials),

  // Faz login e retorna o token de acesso
  login: (credentials: Credentials) =>
    apiClient.post<LoginResponse>('/auth/login', credentials),
}
