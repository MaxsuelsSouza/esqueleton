import crypto from 'crypto'

// Tipos de entidade que possuem imagens no R2
export type ImageEntityType = 'products' | 'stores'

// Gera a key (caminho) de um objeto no R2 com isolamento por tenant.
// O storeId DEVE vir do JWT (request.user.storeId ou request.store.id),
// NUNCA do body da requisição — isso garante o isolamento entre lojas.
//
// Formato: {storeId}/{entityType}/{entityId}/{uuid}.{ext}
// Exemplo: cuid123/products/cuid456/a1b2c3d4.webp
export function buildR2Key(
  storeId: string,
  entityType: ImageEntityType,
  entityId: string,
  extension: string,
): string {
  const uniqueName = crypto.randomUUID().replace(/-/g, '')
  const ext = extension.toLowerCase().replace(/^\./, '')
  return `${storeId}/${entityType}/${entityId}/${uniqueName}.${ext}`
}

// Extrai o storeId de uma key R2 — útil para validação de ownership
export function storeIdFromR2Key(key: string): string | null {
  const firstSlash = key.indexOf('/')
  if (firstSlash === -1) return null
  return key.slice(0, firstSlash)
}

// Gera o prefixo para listar/deletar todas as imagens de uma entidade
// Exemplo: cuid123/products/cuid456/
export function buildR2Prefix(
  storeId: string,
  entityType: ImageEntityType,
  entityId: string,
): string {
  return `${storeId}/${entityType}/${entityId}/`
}

// Gera o prefixo para listar/deletar TODAS as imagens de uma loja
// Usado quando uma loja é deletada (cascata)
// Exemplo: cuid123/
export function buildStorePrefix(storeId: string): string {
  return `${storeId}/`
}
