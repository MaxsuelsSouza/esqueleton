// Serviço de sacola e favoritos — armazena os dados no servidor (Redis)
// em vez de encher o localStorage com objetos de produto.
//
// O visitante é identificado por um token de sessão (UUID) que fica no localStorage
// como uma string curta (~36 caracteres), em vez dos dados completos de cada produto.
import { apiClient } from './api-client'

// Chave do localStorage onde o token de sessão do visitante é guardado
const SESSION_KEY = 'visitor_session'

// Item da sacola como armazenado no servidor — sem dados completos do produto
export type CartApiItem = {
  productId: string
  quantity: number
  promotionId?: string
  promotionName?: string
  // Opções da variante selecionada (ex: { Cor: "Preto", Armazenamento: "1TB" })
  selectedOptions?: Record<string, string>
  // ID da variante selecionada — usado para buscar o preço correto na sacola
  variantId?: string
}

// Obtém o token de sessão do visitante, criando um novo se necessário.
// O token é um UUID v4 gerado no navegador — o servidor aceita qualquer string válida.
export function getSessionToken(): string {
  let token = localStorage.getItem(SESSION_KEY)
  if (!token) {
    token = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, token)
  }
  return token
}

// Monta os headers com o token de sessão
function sessionHeaders(): Record<string, string> {
  return { 'X-Session-Token': getSessionToken() }
}

// Busca a sacola do visitante no servidor
async function getCart(slug: string): Promise<CartApiItem[]> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/lojas/${slug}/session/cart`,
    { headers: { ...sessionHeaders() } },
  )
  if (!response.ok) return []
  const data = await response.json()
  return data.items ?? []
}

// Substitui a sacola inteira no servidor (o frontend sempre envia o estado completo)
async function setCart(slug: string, items: CartApiItem[]): Promise<void> {
  await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/lojas/${slug}/session/cart`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
      body: JSON.stringify({ items }),
    },
  ).catch(() => {}) // fire and forget — falha de rede não deve travar a UI
}

// Limpa a sacola no servidor
async function clearCart(slug: string): Promise<void> {
  await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/lojas/${slug}/session/cart`,
    { method: 'DELETE', headers: { ...sessionHeaders() } },
  ).catch(() => {})
}

// Busca os IDs dos produtos favoritos no servidor
async function getFavorites(slug: string): Promise<string[]> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/lojas/${slug}/session/favorites`,
    { headers: { ...sessionHeaders() } },
  )
  if (!response.ok) return []
  const data = await response.json()
  return data.productIds ?? []
}

// Substitui a lista de favoritos inteira no servidor
async function setFavorites(slug: string, productIds: string[]): Promise<void> {
  await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/lojas/${slug}/session/favorites`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
      body: JSON.stringify({ productIds }),
    },
  ).catch(() => {})
}

// Limpa os favoritos no servidor
async function clearFavorites(slug: string): Promise<void> {
  await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/lojas/${slug}/session/favorites`,
    { method: 'DELETE', headers: { ...sessionHeaders() } },
  ).catch(() => {})
}

export const sessionService = {
  getCart,
  setCart,
  clearCart,
  getFavorites,
  setFavorites,
  clearFavorites,
}
