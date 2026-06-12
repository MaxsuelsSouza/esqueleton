// Validações dos dados de redefinição de senha
import { z } from 'zod'

// Pedido de redefinição — recebe apenas o e-mail
export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido').max(254, 'Email muito longo'),
})

// Redefinição com o token recebido por e-mail
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(72, 'Senha muito longa'),
})
