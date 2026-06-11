// Validações reutilizáveis — garantem que dados recebidos de fora tenham
// o formato esperado antes de chegar ao banco de dados.
// Mesmo com o Prisma protegendo contra SQL injection, validar o formato
// bloqueia dados malformados, textos gigantes e conteúdo malicioso (ex: links "javascript:").
import { z } from 'zod'

// IDs gerados pelo banco (cuid) contêm apenas letras e números
export const idSchema = z
  .string()
  .trim()
  .min(1, 'ID é obrigatório')
  .max(64, 'ID inválido')
  .regex(/^[A-Za-z0-9_-]+$/, 'ID inválido')

// Valida o parâmetro :id presente na URL das rotas
export const idParamSchema = z.object({ id: idSchema })

// Lista de IDs (categorias ou produtos vinculados) — limitada para evitar consultas gigantes
export const idListSchema = z.array(idSchema).max(500, 'Lista de IDs muito grande')

// Data no formato AAAA-MM-DD (ex: "2026-06-11")
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida — use o formato AAAA-MM-DD')

// Horário no formato HH:MM (ex: "18:30")
export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido — use o formato HH:MM')

// Cor hexadecimal (ex: "#f97316")
export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{3,8}$/, 'Cor inválida — use o formato hexadecimal, ex: #f97316')

// URL http/https genérica — bloqueia links perigosos como "javascript:"
export const httpUrlSchema = z
  .string()
  .max(2048, 'URL muito longa')
  .url('URL inválida')
  .regex(/^https?:\/\//, 'A URL deve começar com http:// ou https://')

// Tamanho máximo de uma imagem enviada embutida (base64) — cerca de 3 MB já codificada.
// Imagens maiores devem ser otimizadas antes do envio (ou, no futuro, ir para um storage externo).
const MAX_IMAGE_DATA_URL_LENGTH = 3 * 1024 * 1024

// Campo de imagem do produto e da logo da loja.
// Aceita DUAS formas:
//   1. URL http/https de uma imagem hospedada em outro lugar
//   2. Imagem enviada pelo painel, embutida no formato "data:image/...;base64,..."
// Bloqueia esquemas perigosos (ex: "javascript:") e data URIs que não sejam de imagem.
export const imageUrlSchema = z
  .string()
  .max(MAX_IMAGE_DATA_URL_LENGTH, 'Imagem muito grande — otimize a imagem antes de enviar')
  .refine(
    (value) =>
      /^https?:\/\/.+/i.test(value) ||
      /^data:image\/(png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/]+=*$/i.test(value),
    'Imagem inválida — use uma URL http(s) ou envie uma imagem pelo painel',
  )

// Telefone — apenas dígitos, espaços, parênteses, "+" e "-"
export const phoneSchema = z
  .string()
  .min(8, 'Telefone inválido')
  .max(30, 'Telefone inválido')
  .regex(/^[0-9()+\-\s]+$/, 'Telefone inválido')

// Texto curto com limite de tamanho — remove espaços das pontas
export function shortText(maxLength: number, requiredMessage?: string) {
  const base = z.string().trim().max(maxLength, 'Texto muito longo')
  return requiredMessage ? base.min(1, requiredMessage) : base
}
