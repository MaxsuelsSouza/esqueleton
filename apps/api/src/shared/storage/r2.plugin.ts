import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3'

// Serviço de armazenamento de imagens no Cloudflare R2 (compatível com S3).
// Se as credenciais R2 não estiverem definidas:
//   - Em produção (NODE_ENV=production): a API recusa iniciar — imagens DEVEM ir para o R2.
//   - Em dev: app.storage = null — imagens continuam como base64 no banco (sem R2).

export type StorageService = {
  // Faz upload de um buffer e retorna a URL pública do objeto
  upload: (key: string, buffer: Buffer, contentType: string) => Promise<string>
  // Remove um objeto do bucket
  delete: (key: string) => Promise<void>
  // Remove todos os objetos com um prefixo (ex: deletar todas as imagens de um produto)
  deleteByPrefix: (prefix: string) => Promise<void>
}

declare module 'fastify' {
  interface FastifyInstance {
    storage: StorageService | null
  }
}

const plugin: FastifyPluginAsync = async (app) => {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucketName = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL

  const hasCredentials = accountId && accessKeyId && secretAccessKey && bucketName && publicUrl

  if (!hasCredentials) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Variáveis R2 obrigatórias em produção: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL',
      )
    }

    app.log.warn('Variáveis R2 não definidas — imagens serão salvas como base64 no banco (apenas dev)')
    app.decorate('storage', null)
    return
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })

  // Normaliza a URL pública removendo barra final
  const baseUrl = publicUrl.replace(/\/+$/, '')

  app.decorate('storage', {
    async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
      await client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      )
      return `${baseUrl}/${key}`
    },

    async delete(key: string): Promise<void> {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        }),
      )
    },

    async deleteByPrefix(prefix: string): Promise<void> {
      // Lista todos os objetos com o prefixo e deleta em lote
      const listed = await client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
        }),
      )

      const objects = listed.Contents
      if (!objects || objects.length === 0) return

      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: objects.map((obj) => ({ Key: obj.Key })),
            Quiet: true,
          },
        }),
      )
    },
  } satisfies StorageService)
}

export const r2Plugin = fp(plugin)
