#!/usr/bin/env node

// Script de manutenção — troca o domínio das URLs de imagem salvas no banco.
// Usado na migração do domínio img.esqueleton.com.br (custom domain do R2,
// que depende do DNS na Cloudflare) para a URL pública r2.dev do bucket.
//
// Cobre: foto principal e fotos adicionais dos produtos, fotos das
// variantes, logo e banner do perfil da loja. É idempotente: só altera
// URLs que começam com o domínio antigo.
//
// Uso (a partir de apps/api):
//   node scripts/trocar-dominio-imagens.mjs --dry-run   (apenas mostra o que faria)
//   node scripts/trocar-dominio-imagens.mjs             (altera de verdade)
//
// Requer DATABASE_URL apontando para o banco desejado.

import { PrismaClient } from '@prisma/client'

const DOMINIO_ANTIGO = 'https://img.esqueleton.com.br'
const DOMINIO_NOVO = 'https://pub-342f61fcf1fc43c2ad745d00db2c00d1.r2.dev'

const dryRun = process.argv.includes('--dry-run')

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definida. Rode com: DATABASE_URL="postgres://..." node scripts/trocar-dominio-imagens.mjs')
  process.exit(1)
}

const prisma = new PrismaClient()

// Troca o domínio se a URL começar com o antigo; senão devolve null (nada a fazer)
function trocarDominio(url) {
  if (typeof url !== 'string' || !url.startsWith(DOMINIO_ANTIGO)) return null
  return DOMINIO_NOVO + url.slice(DOMINIO_ANTIGO.length)
}

// ── Produtos (foto principal + fotos adicionais) ─────────────────────
async function atualizarProdutos() {
  const produtos = await prisma.product.findMany({
    select: { id: true, storeId: true, imageUrl: true, images: true },
  })

  let alterados = 0
  for (const produto of produtos) {
    const updates = {}

    const novaFotoPrincipal = trocarDominio(produto.imageUrl)
    if (novaFotoPrincipal) updates.imageUrl = novaFotoPrincipal

    if (produto.images && produto.images.length > 0) {
      let mudou = false
      const novasFotos = produto.images.map((foto) => {
        const nova = trocarDominio(foto)
        if (nova) mudou = true
        return nova ?? foto
      })
      if (mudou) updates.images = novasFotos
    }

    if (Object.keys(updates).length > 0) {
      if (!dryRun) {
        await prisma.product.updateMany({ where: { id: produto.id, storeId: produto.storeId }, data: updates })
      }
      alterados++
      console.log(`Produto ${produto.id}: ${Object.keys(updates).join(', ')} atualizado(s)`)
    }
  }
  return alterados
}

// ── Variantes ────────────────────────────────────────────────────────
async function atualizarVariantes() {
  const variantes = await prisma.productVariant.findMany({
    select: { id: true, storeId: true, imageUrl: true },
  })

  let alteradas = 0
  for (const variante of variantes) {
    const novaUrl = trocarDominio(variante.imageUrl)
    if (novaUrl) {
      if (!dryRun) {
        await prisma.productVariant.updateMany({
          where: { id: variante.id, storeId: variante.storeId },
          data: { imageUrl: novaUrl },
        })
      }
      alteradas++
      console.log(`Variante ${variante.id}: imageUrl atualizado`)
    }
  }
  return alteradas
}

// ── Perfis das lojas (logo e banner) ─────────────────────────────────
async function atualizarPerfis() {
  // Busca campo a campo para não quebrar caso o banco ainda não tenha
  // a coluna bannerUrl (migração recente)
  let perfis
  let temBanner = true
  try {
    perfis = await prisma.storeProfile.findMany({
      select: { id: true, storeId: true, logoUrl: true, bannerUrl: true, bannerMobileUrl: true },
    })
  } catch {
    temBanner = false
    perfis = await prisma.storeProfile.findMany({
      select: { id: true, storeId: true, logoUrl: true },
    })
    console.log('(colunas de banner não existem neste banco — atualizando apenas logos)')
  }

  let alterados = 0
  for (const perfil of perfis) {
    const updates = {}

    const novoLogo = trocarDominio(perfil.logoUrl)
    if (novoLogo) updates.logoUrl = novoLogo

    if (temBanner) {
      const novoBanner = trocarDominio(perfil.bannerUrl)
      if (novoBanner) updates.bannerUrl = novoBanner

      const novoBannerMobile = trocarDominio(perfil.bannerMobileUrl)
      if (novoBannerMobile) updates.bannerMobileUrl = novoBannerMobile
    }

    if (Object.keys(updates).length > 0) {
      if (!dryRun) {
        // updateMany não devolve a linha — evita erro quando o banco
        // ainda não tem colunas novas do schema local (ex: bannerUrl)
        await prisma.storeProfile.updateMany({ where: { id: perfil.id }, data: updates })
      }
      alterados++
      console.log(`Perfil da loja ${perfil.storeId}: ${Object.keys(updates).join(', ')} atualizado(s)`)
    }
  }
  return alterados
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log(dryRun ? '=== MODO DRY-RUN (nada será alterado) ===' : '=== Trocando domínio das imagens ===')
  console.log(`De:   ${DOMINIO_ANTIGO}`)
  console.log(`Para: ${DOMINIO_NOVO}`)
  console.log()

  const produtos = await atualizarProdutos()
  const variantes = await atualizarVariantes()
  const perfis = await atualizarPerfis()

  console.log()
  console.log(`Resumo: ${produtos} produto(s), ${variantes} variante(s), ${perfis} perfil(is) atualizado(s)`)
  if (dryRun) console.log('(nenhuma alteração real — rode sem --dry-run para aplicar)')
}

main()
  .catch((err) => { console.error('Erro:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
