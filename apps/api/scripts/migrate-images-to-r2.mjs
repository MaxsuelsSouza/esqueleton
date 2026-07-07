#!/usr/bin/env node

// Script de migração — lê imagens base64 do banco e envia para o R2.
// Substitui o valor no banco pela URL pública. É idempotente: pula
// registros que já contêm URLs http(s).
//
// Uso:
//   node scripts/migrate-images-to-r2.mjs
//   node scripts/migrate-images-to-r2.mjs --dry-run   (apenas mostra o que faria)
//
// Requer as variáveis de ambiente R2 e DATABASE_URL configuradas.

import { PrismaClient } from '@prisma/client'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'

const dryRun = process.argv.includes('--dry-run')

// ── Validação das variáveis de ambiente ──────────────────────────────
const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL']
const missing = required.filter((k) => !process.env[k])
if (missing.length > 0) {
  console.error(`Variáveis obrigatórias ausentes: ${missing.join(', ')}`)
  process.exit(1)
}

const accountId = process.env.R2_ACCOUNT_ID
const bucketName = process.env.R2_BUCKET_NAME
const publicUrl = process.env.R2_PUBLIC_URL.replace(/\/+$/, '')

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

const prisma = new PrismaClient()

// ── Helpers ──────────────────────────────────────────────────────────

const MIME_TO_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

function isBase64(value) {
  return typeof value === 'string' && value.startsWith('data:image/')
}

function parseBase64(dataUrl) {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i)
  if (!match) return null
  const mimeType = match[1].toLowerCase()
  const ext = MIME_TO_EXT[mimeType]
  if (!ext) return null
  return { buffer: Buffer.from(match[2], 'base64'), mimeType, ext }
}

function buildKey(storeId, entityType, entityId, ext) {
  const uuid = crypto.randomUUID().replace(/-/g, '')
  return `${storeId}/${entityType}/${entityId}/${uuid}.${ext}`
}

async function uploadToR2(key, buffer, contentType) {
  // Cache eterno: cada key tem UUID e nunca é sobrescrita (mesmo header do r2.plugin.ts)
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )
  return `${publicUrl}/${key}`
}

async function migrateField(value, storeId, entityType, entityId) {
  if (!isBase64(value)) return null // já é URL ou null
  const parsed = parseBase64(value)
  if (!parsed) { console.warn(`  ⚠ formato não reconhecido, pulando`); return null }
  const key = buildKey(storeId, entityType, entityId, parsed.ext)
  if (dryRun) {
    console.log(`  [dry-run] upload ${key} (${(parsed.buffer.length / 1024).toFixed(0)} KB)`)
    return `${publicUrl}/${key}`
  }
  const url = await uploadToR2(key, parsed.buffer, parsed.mimeType)
  console.log(`  ✓ ${key} (${(parsed.buffer.length / 1024).toFixed(0)} KB)`)
  return url
}

// ── Migração de produtos ─────────────────────────────────────────────
async function migrateProducts() {
  const products = await prisma.product.findMany({
    select: { id: true, storeId: true, imageUrl: true, images: true },
  })

  let migrated = 0
  for (const product of products) {
    const updates = {}

    // Foto principal
    const newImageUrl = await migrateField(product.imageUrl, product.storeId, 'products', product.id)
    if (newImageUrl) updates.imageUrl = newImageUrl

    // Fotos adicionais
    if (product.images && product.images.length > 0) {
      const newImages = []
      let changed = false
      for (const img of product.images) {
        const newUrl = await migrateField(img, product.storeId, 'products', product.id)
        if (newUrl) { newImages.push(newUrl); changed = true }
        else newImages.push(img)
      }
      if (changed) updates.images = newImages
    }

    if (Object.keys(updates).length > 0) {
      if (!dryRun) {
        await prisma.product.updateMany({ where: { id: product.id, storeId: product.storeId }, data: updates })
      }
      migrated++
      console.log(`Produto ${product.id}: ${Object.keys(updates).join(', ')} migrado(s)`)
    }
  }
  return migrated
}

// ── Migração de variantes ────────────────────────────────────────────
async function migrateVariants() {
  const variants = await prisma.productVariant.findMany({
    select: { id: true, storeId: true, productId: true, imageUrl: true },
  })

  let migrated = 0
  for (const variant of variants) {
    const newUrl = await migrateField(variant.imageUrl, variant.storeId, 'products', variant.productId)
    if (newUrl) {
      if (!dryRun) {
        await prisma.productVariant.updateMany({
          where: { id: variant.id, storeId: variant.storeId },
          data: { imageUrl: newUrl },
        })
      }
      migrated++
      console.log(`Variante ${variant.id}: imageUrl migrado`)
    }
  }
  return migrated
}

// ── Migração de logos ────────────────────────────────────────────────
async function migrateLogos() {
  const profiles = await prisma.storeProfile.findMany({
    select: { id: true, storeId: true, logoUrl: true },
  })

  let migrated = 0
  for (const profile of profiles) {
    const newUrl = await migrateField(profile.logoUrl, profile.storeId, 'stores', profile.storeId)
    if (newUrl) {
      if (!dryRun) {
        await prisma.storeProfile.update({ where: { id: profile.id }, data: { logoUrl: newUrl } })
      }
      migrated++
      console.log(`Logo da loja ${profile.storeId}: migrado`)
    }
  }
  return migrated
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log(dryRun ? '=== MODO DRY-RUN (nada será alterado) ===' : '=== Migrando imagens para R2 ===')
  console.log()

  console.log('── Produtos ──')
  const products = await migrateProducts()

  console.log('── Variantes ──')
  const variants = await migrateVariants()

  console.log('── Logos ──')
  const logos = await migrateLogos()

  console.log()
  console.log(`Resumo: ${products} produto(s), ${variants} variante(s), ${logos} logo(s) migrado(s)`)
  if (dryRun) console.log('(nenhuma alteração real — rode sem --dry-run para migrar)')
}

main()
  .catch((err) => { console.error('Erro na migração:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
