import type { FastifyBaseLogger } from 'fastify'
import type { StorageService } from './r2.plugin'
import { buildR2Key, type ImageEntityType } from './r2-key'

// Mapeamento de MIME type base64 → extensão para o R2
const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

// Extrai o MIME type e o buffer de uma data URL base64
// Formato esperado: data:image/png;base64,iVBORw0KGgo...
function parseBase64DataUrl(dataUrl: string): { buffer: Buffer; mimeType: string; extension: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i)
  if (!match) return null

  const mimeType = match[1].toLowerCase()
  const extension = MIME_TO_EXT[mimeType]
  if (!extension) return null

  const buffer = Buffer.from(match[2], 'base64')
  return { buffer, mimeType, extension }
}

// Verifica se o valor é uma data URL base64 de imagem
function isBase64Image(value: string): boolean {
  return value.startsWith('data:image/')
}

// Faz upload de uma imagem para o R2 se for base64 e o storage estiver disponível.
// - Se o valor é uma URL http(s): retorna como está (já é externa).
// - Se o valor é base64 e storage existe: faz upload e retorna a URL pública do R2.
// - Se o valor é base64 e storage é null (dev sem R2): retorna o base64 como está.
// - Se o upload falhar: lança erro (NÃO faz fallback silencioso).
export async function uploadImage(
  storage: StorageService | null,
  log: FastifyBaseLogger,
  value: string | undefined | null,
  storeId: string,
  entityType: ImageEntityType,
  entityId: string,
): Promise<string | undefined> {
  // Sem valor ou valor vazio
  if (!value) return undefined

  // Já é uma URL http(s) — não precisa de upload
  if (/^https?:\/\//i.test(value)) return value

  // Não é base64 de imagem — retorna como está (validação Zod já filtra formatos inválidos)
  if (!isBase64Image(value)) return value

  // Base64 mas sem R2 configurado (dev local)
  if (!storage) {
    log.debug('R2 não configurado — imagem salva como base64 no banco (dev)')
    return value
  }

  // Extrai o buffer da data URL
  const parsed = parseBase64DataUrl(value)
  if (!parsed) {
    log.warn('Formato de data URL não reconhecido — imagem rejeitada')
    throw new Error('Formato de imagem inválido')
  }

  // Gera a key com isolamento por tenant e faz o upload
  const key = buildR2Key(storeId, entityType, entityId, parsed.extension)
  const url = await storage.upload(key, parsed.buffer, parsed.mimeType)
  log.info({ key, size: parsed.buffer.length }, 'Imagem enviada para o R2')
  return url
}

// Faz upload de múltiplas imagens (array de strings) em paralelo
export async function uploadImages(
  storage: StorageService | null,
  log: FastifyBaseLogger,
  values: string[] | undefined | null,
  storeId: string,
  entityType: ImageEntityType,
  entityId: string,
): Promise<string[] | undefined> {
  if (!values || values.length === 0) return undefined

  const results = await Promise.all(
    values.map((v) => uploadImage(storage, log, v, storeId, entityType, entityId)),
  )

  return results.filter((r): r is string => r !== undefined)
}
