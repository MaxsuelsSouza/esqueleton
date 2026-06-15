// Script de correção de preços — garante que todos os produtos e variantes
// tenham price preenchido (> 0). Após a remoção da coluna originalPrice,
// alguns registros podem ter ficado com price = 0 ou valores incorretos.
//
// O que ele faz:
// 1. Busca produtos com price = 0 e atribui um preço baseado na variante mais barata
// 2. Busca variantes com price = 0 e atribui o preço do produto pai
// 3. Lista todos os produtos e variantes para conferência
//
// Execute com: cd apps/api && npx tsx prisma/seed-fix-prices.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n🔍 Verificando produtos e variantes com preço zerado ou ausente...\n')

  // ── Produtos com price = 0 ───────────────────────────────────────
  const produtosSemPreco = await prisma.product.findMany({
    where: { price: 0 },
    include: { variants: { select: { id: true, price: true, options: true } } },
  })

  if (produtosSemPreco.length > 0) {
    console.log(`⚠ ${produtosSemPreco.length} produto(s) com price = 0:\n`)
    for (const p of produtosSemPreco) {
      // Usa o preço da variante mais barata como preço base do produto
      const variantePrices = p.variants.map((v) => v.price).filter((pr) => pr > 0)
      const novoPreco = variantePrices.length > 0 ? Math.min(...variantePrices) : 0

      if (novoPreco > 0) {
        await prisma.product.update({
          where: { id: p.id },
          data: { price: novoPreco },
        })
        console.log(`  ✔ "${p.brand ?? ''} ${p.name}" → R$ ${novoPreco.toFixed(2)} (menor variante)`)
      } else {
        console.log(`  ⚠ "${p.brand ?? ''} ${p.name}" → sem variantes com preço, precisa de correção manual`)
      }
    }
  } else {
    console.log('✔ Todos os produtos têm price > 0')
  }

  // ── Variantes com price = 0 ──────────────────────────────────────
  const variantesSemPreco = await prisma.productVariant.findMany({
    where: { price: 0 },
    include: { product: { select: { id: true, name: true, brand: true, price: true } } },
  })

  if (variantesSemPreco.length > 0) {
    console.log(`\n⚠ ${variantesSemPreco.length} variante(s) com price = 0:\n`)
    for (const v of variantesSemPreco) {
      // Usa o preço do produto pai
      if (v.product.price > 0) {
        await prisma.productVariant.update({
          where: { id: v.id },
          data: { price: v.product.price },
        })
        const opts = JSON.stringify(v.options)
        console.log(`  ✔ "${v.product.brand ?? ''} ${v.product.name}" ${opts} → R$ ${v.product.price.toFixed(2)} (preço do produto)`)
      } else {
        console.log(`  ⚠ Variante de "${v.product.name}" → produto também sem preço`)
      }
    }
  } else {
    console.log('✔ Todas as variantes têm price > 0')
  }

  // ── Resumo ───────────────────────────────────────────────────────
  console.log('\n── Resumo dos produtos no banco ──────────────────────────\n')
  const todosProdutos = await prisma.product.findMany({
    include: {
      variants: { select: { id: true, options: true, price: true, active: true } },
    },
    orderBy: { name: 'asc' },
  })

  for (const p of todosProdutos) {
    const varInfo = p.variants.length > 0
      ? ` (${p.variants.length} variantes: ${p.variants.map((v) => `R$${v.price}`).join(', ')})`
      : ''
    const status = p.price > 0 ? '✔' : '⚠ PREÇO ZERO'
    console.log(`  ${status} ${p.brand ?? ''} ${p.name}: R$ ${p.price.toFixed(2)}${varInfo}`)
  }

  console.log(`\n✅ Verificação concluída. Total: ${todosProdutos.length} produtos.\n`)
}

main()
  .catch((error) => {
    console.error('Erro:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
