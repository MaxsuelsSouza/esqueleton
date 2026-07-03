// Armazena sacola e favoritos dos visitantes das lojas.
//
// Com REDIS_URL configurado (ex: Upstash), os dados ficam em um Redis compartilhado
// com expiração automática de 30 dias — o visitante pode fechar o navegador e voltar
// depois que a sacola ainda estará lá.
//
// Sem REDIS_URL (dev local), usa um Map em memória — funciona para testes, mas
// os dados somem ao reiniciar o servidor.

// Tempo de vida dos dados no Redis — 30 dias em segundos
const TTL_SECONDS = 30 * 24 * 60 * 60

// Item da sacola armazenado no Redis — apenas IDs e quantidades, sem dados do produto
// (nome, preço, imagem são buscados frescos do banco ao carregar a sacola)
export type CartRedisItem = {
  productId: string
  quantity: number
  promotionId?: string
  promotionName?: string
}

// Interface mínima do ioredis que usamos aqui — evita importar o pacote inteiro
// quando ele nem está carregado (dev sem REDIS_URL)
type RedisClient = {
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string, expiryMode: string, time: number) => Promise<unknown>
  del: (key: string) => Promise<unknown>
  quit: () => Promise<unknown>
}

// Revogação de sessão (LGPD, Fase 4.4): a marca vive pelo tempo de vida do
// token (1 dia) — depois disso o próprio token já expirou e a marca é inútil
const REVOGACAO_TTL_SECONDS = 24 * 60 * 60

// Contrato que as rotas usam — tanto o Redis quanto o Map em memória implementam
export interface SessionStore {
  getCart(storeId: string, sessionToken: string): Promise<CartRedisItem[]>
  setCart(storeId: string, sessionToken: string, items: CartRedisItem[]): Promise<void>
  deleteCart(storeId: string, sessionToken: string): Promise<void>

  getFavorites(storeId: string, sessionToken: string): Promise<string[]>
  setFavorites(storeId: string, sessionToken: string, productIds: string[]): Promise<void>
  deleteFavorites(storeId: string, sessionToken: string): Promise<void>

  // Revogação de sessão: tokens emitidos ANTES da marca (timestamp em segundos,
  // como o iat do JWT) deixam de valer — usada no logout, na troca de senha e
  // na remoção de membro da equipe
  setRevogacao(userId: string, timestampSegundos: number): Promise<void>
  getRevogacao(userId: string): Promise<number | null>

  close(): Promise<void>
}

// Implementação com Redis — usada em produção e quando REDIS_URL está definido
class RedisSessionStore implements SessionStore {
  constructor(private redis: RedisClient) {}

  private cartKey(storeId: string, token: string) {
    return `cart:${storeId}:${token}`
  }

  private favKey(storeId: string, token: string) {
    return `fav:${storeId}:${token}`
  }

  async getCart(storeId: string, sessionToken: string): Promise<CartRedisItem[]> {
    const data = await this.redis.get(this.cartKey(storeId, sessionToken))
    if (!data) return []
    try { return JSON.parse(data) } catch { return [] }
  }

  async setCart(storeId: string, sessionToken: string, items: CartRedisItem[]): Promise<void> {
    if (items.length === 0) {
      await this.redis.del(this.cartKey(storeId, sessionToken))
      return
    }
    await this.redis.set(this.cartKey(storeId, sessionToken), JSON.stringify(items), 'EX', TTL_SECONDS)
  }

  async deleteCart(storeId: string, sessionToken: string): Promise<void> {
    await this.redis.del(this.cartKey(storeId, sessionToken))
  }

  async getFavorites(storeId: string, sessionToken: string): Promise<string[]> {
    const data = await this.redis.get(this.favKey(storeId, sessionToken))
    if (!data) return []
    try { return JSON.parse(data) } catch { return [] }
  }

  async setFavorites(storeId: string, sessionToken: string, productIds: string[]): Promise<void> {
    if (productIds.length === 0) {
      await this.redis.del(this.favKey(storeId, sessionToken))
      return
    }
    await this.redis.set(this.favKey(storeId, sessionToken), JSON.stringify(productIds), 'EX', TTL_SECONDS)
  }

  async deleteFavorites(storeId: string, sessionToken: string): Promise<void> {
    await this.redis.del(this.favKey(storeId, sessionToken))
  }

  async setRevogacao(userId: string, timestampSegundos: number): Promise<void> {
    await this.redis.set(`revogacao:${userId}`, String(timestampSegundos), 'EX', REVOGACAO_TTL_SECONDS)
  }

  async getRevogacao(userId: string): Promise<number | null> {
    const data = await this.redis.get(`revogacao:${userId}`)
    if (!data) return null
    const timestamp = Number(data)
    return Number.isFinite(timestamp) ? timestamp : null
  }

  async close(): Promise<void> {
    await this.redis.quit()
  }
}

// Implementação com Map em memória — usada em dev local sem Redis.
// Itens expiram aproximadamente após o TTL, via limpeza preguiçosa.
class InMemorySessionStore implements SessionStore {
  private data = new Map<string, { value: string; expiresAt: number }>()

  private get(key: string): string | null {
    const entry = this.data.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.data.delete(key)
      return null
    }
    return entry.value
  }

  private set(key: string, value: string): void {
    this.data.set(key, { value, expiresAt: Date.now() + TTL_SECONDS * 1000 })
  }

  private del(key: string): void {
    this.data.delete(key)
  }

  async getCart(storeId: string, sessionToken: string): Promise<CartRedisItem[]> {
    const data = this.get(`cart:${storeId}:${sessionToken}`)
    if (!data) return []
    try { return JSON.parse(data) } catch { return [] }
  }

  async setCart(storeId: string, sessionToken: string, items: CartRedisItem[]): Promise<void> {
    if (items.length === 0) { this.del(`cart:${storeId}:${sessionToken}`); return }
    this.set(`cart:${storeId}:${sessionToken}`, JSON.stringify(items))
  }

  async deleteCart(storeId: string, sessionToken: string): Promise<void> {
    this.del(`cart:${storeId}:${sessionToken}`)
  }

  async getFavorites(storeId: string, sessionToken: string): Promise<string[]> {
    const data = this.get(`fav:${storeId}:${sessionToken}`)
    if (!data) return []
    try { return JSON.parse(data) } catch { return [] }
  }

  async setFavorites(storeId: string, sessionToken: string, productIds: string[]): Promise<void> {
    if (productIds.length === 0) { this.del(`fav:${storeId}:${sessionToken}`); return }
    this.set(`fav:${storeId}:${sessionToken}`, JSON.stringify(productIds))
  }

  async deleteFavorites(storeId: string, sessionToken: string): Promise<void> {
    this.del(`fav:${storeId}:${sessionToken}`)
  }

  async setRevogacao(userId: string, timestampSegundos: number): Promise<void> {
    // Marca expira junto com o token (1 dia) — a limpeza preguiçosa do get resolve
    this.data.set(`revogacao:${userId}`, {
      value: String(timestampSegundos),
      expiresAt: Date.now() + REVOGACAO_TTL_SECONDS * 1000,
    })
  }

  async getRevogacao(userId: string): Promise<number | null> {
    const data = this.get(`revogacao:${userId}`)
    if (!data) return null
    const timestamp = Number(data)
    return Number.isFinite(timestamp) ? timestamp : null
  }

  async close(): Promise<void> {
    this.data.clear()
  }
}

// Cria o store adequado ao ambiente — Redis se disponível, memória caso contrário
export function createSessionStore(redisUrl: string | undefined): SessionStore {
  if (!redisUrl) {
    return new InMemorySessionStore()
  }

  // Carrega ioredis sob demanda — mesmo padrão do rate-limit-redis.ts
  const Redis = require('ioredis') as new (url: string, opts: object) => RedisClient
  const client = new Redis(redisUrl, {
    connectTimeout: 500,
    maxRetriesPerRequest: 1,
  })

  return new RedisSessionStore(client)
}
