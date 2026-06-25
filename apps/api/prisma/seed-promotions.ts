// Script de seed de promoções — recria as promoções com todos os tipos corretos
// Execute com: cd apps/api && npx tsx prisma/seed-promotions.ts
//
// Tipos disponíveis: percentage | fixed | buy_x_get_y | kit | custom
// Este script apaga TODAS as promoções existentes da loja e cria novas

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const store = await prisma.store.findFirst()
  if (!store) {
    console.error('Nenhuma loja encontrada. Crie uma loja primeiro.')
    process.exit(1)
  }
  console.log(`\nLoja: ${store.name} (${store.slug})\n`)

  // Busca todos os produtos da loja para montar as promoções
  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    select: { id: true, name: true, brand: true, price: true },
    orderBy: { createdAt: 'asc' },
  })

  if (products.length < 10) {
    console.error('Poucos produtos encontrados. Rode o seed-completo.ts primeiro.')
    process.exit(1)
  }

  console.log(`${products.length} produtos encontrados.\n`)

  // Função para buscar produto por índice na lista (0-based)
  const p = (index: number) => products[index]

  // Limpa promoções existentes
  const deleted = await prisma.promotion.deleteMany({ where: { storeId: store.id } })
  console.log(`🗑️  ${deleted.count} promoções removidas.\n`)
  console.log('Criando promoções de teste...\n')

  // ── 1. PERCENTAGE — desconto percentual ────────────────────────────

  await prisma.promotion.create({
    data: {
      name: '15% Samsung',
      type: 'percentage',
      discountPercent: 15,
      productIds: [p(0).id, p(1).id],
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      description: '15% de desconto em smartphones Samsung selecionados.',
      color: '#1428a0',
      active: true,
      priority: 1,
      storeId: store.id,
    },
  })
  console.log(`  ✔ [percentage] 15% Samsung — ${p(0).brand} ${p(0).name}, ${p(1).brand} ${p(1).name}`)

  await prisma.promotion.create({
    data: {
      name: '25% Áudio',
      type: 'percentage',
      discountPercent: 25,
      productIds: [p(20).id, p(21).id, p(22).id, p(23).id],
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      description: '25% de desconto em headphones e caixas de som.',
      color: '#dc2626',
      active: true,
      priority: 2,
      storeId: store.id,
    },
  })
  console.log(`  ✔ [percentage] 25% Áudio — 4 produtos de áudio`)

  // ── 2. FIXED — desconto em valor fixo ──────────────────────────────

  await prisma.promotion.create({
    data: {
      name: 'R$200 off Notebooks',
      type: 'fixed',
      discountValue: 200,
      productIds: [p(24).id, p(25).id, p(28).id],
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      description: 'R$200 de desconto em notebooks selecionados.',
      color: '#16a34a',
      active: true,
      priority: 3,
      storeId: store.id,
    },
  })
  console.log(`  ✔ [fixed] R$200 off — 3 notebooks`)

  await prisma.promotion.create({
    data: {
      name: 'R$50 off Carregadores',
      type: 'fixed',
      discountValue: 50,
      productIds: [p(12).id, p(13).id, p(14).id, p(15).id],
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      description: 'R$50 de desconto em carregadores selecionados.',
      color: '#0891b2',
      active: true,
      priority: 4,
      storeId: store.id,
    },
  })
  console.log(`  ✔ [fixed] R$50 off — 4 carregadores`)

  // ── 3. BUY_X_GET_Y — compre X leve Y ──────────────────────────────

  await prisma.promotion.create({
    data: {
      name: 'Compre 2 Leve 3 Capinhas',
      type: 'buy_x_get_y',
      buyQuantity: 2,
      getQuantity: 3,
      productIds: [p(7).id, p(8).id, p(9).id, p(10).id, p(11).id],
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      description: 'Compre 2 acessórios para celular e leve 3 — o mais barato sai de graça!',
      color: '#f97316',
      active: true,
      priority: 5,
      storeId: store.id,
    },
  })
  console.log(`  ✔ [buy_x_get_y] Compre 2 Leve 3 — 5 acessórios de celular`)

  await prisma.promotion.create({
    data: {
      name: 'Compre 3 Leve 5 Cabos',
      type: 'buy_x_get_y',
      buyQuantity: 3,
      getQuantity: 5,
      productIds: [p(15).id, p(16).id, p(17).id],
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      // Sem description — o sistema deve gerar texto automático
      color: '#ea580c',
      active: true,
      priority: 6,
      storeId: store.id,
    },
  })
  console.log(`  ✔ [buy_x_get_y] Compre 3 Leve 5 — 3 cabos/carregadores (sem descrição, testa auto-texto)`)

  // ── 4. KIT — preço fixo para combo de produtos ─────────────────────

  await prisma.promotion.create({
    data: {
      name: 'Kit Áudio Premium',
      type: 'kit',
      kitPrice: 2199.99,
      productIds: [p(21).id, p(22).id],
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      description: 'Leve o Sony WH-1000XM5 + JBL Flip 6 por apenas R$ 2.199,99 (economia de R$ 500!).',
      color: '#7c3aed',
      active: true,
      priority: 7,
      storeId: store.id,
    },
  })
  console.log(`  ✔ [kit] Kit Áudio Premium — ${p(21).brand} ${p(21).name} + ${p(22).brand} ${p(22).name} por R$2.199,99`)

  await prisma.promotion.create({
    data: {
      name: 'Kit Setup Completo',
      type: 'kit',
      kitPrice: 999.99,
      productIds: [p(29).id, p(30).id, p(32).id],
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      // Sem description — o sistema deve gerar "Kit com 3 produtos por R$ 999,99"
      color: '#6d28d9',
      active: true,
      priority: 8,
      storeId: store.id,
    },
  })
  console.log(`  ✔ [kit] Kit Setup Completo — Mouse + Teclado + Hub por R$999,99 (sem descrição, testa auto-texto)`)

  await prisma.promotion.create({
    data: {
      name: 'Kit Gamer',
      type: 'kit',
      kitPrice: 4999.99,
      productIds: [p(38).id, p(40).id, p(41).id],
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      description: 'PlayStation 5 + DualSense + Headset HyperX por um preço imbatível.',
      color: '#2563eb',
      active: true,
      priority: 9,
      storeId: store.id,
    },
  })
  console.log(`  ✔ [kit] Kit Gamer — PS5 + Controle + Headset por R$4.999,99`)

  // ── 5. CUSTOM — promoção livre com regra personalizada ─────────────

  await prisma.promotion.create({
    data: {
      name: 'Liquidação Apple',
      type: 'custom',
      discountPercent: 10,
      productIds: [p(4).id, p(5).id, p(18).id, p(26).id, p(34).id, p(35).id],
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      description: 'Semana Apple: 10% de desconto em todos os produtos Apple. Aproveite!',
      color: '#374151',
      active: true,
      priority: 10,
      storeId: store.id,
    },
  })
  console.log(`  ✔ [custom] Liquidação Apple — 6 produtos Apple com 10% (tipo custom com discountPercent)`)

  await prisma.promotion.create({
    data: {
      name: 'Queima de Estoque Tablets',
      type: 'custom',
      discountValue: 300,
      productIds: [p(33).id, p(34).id],
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      description: 'Últimas unidades de tablets com R$300 de desconto. Corra!',
      color: '#b91c1c',
      active: true,
      priority: 11,
      storeId: store.id,
    },
  })
  console.log(`  ✔ [custom] Queima Tablets — 2 tablets com R$300 off (tipo custom com discountValue)`)

  // ── 6. PERCENTAGE com horário (happy hour) ─────────────────────────

  await prisma.promotion.create({
    data: {
      name: 'Happy Hour Tech',
      type: 'percentage',
      discountPercent: 10,
      productIds: [],
      startTime: '18:00',
      endTime: '23:59',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      description: '10% de desconto em TODO o catálogo das 18h à meia-noite!',
      color: '#ec4899',
      active: true,
      priority: 99,
      storeId: store.id,
    },
  })
  console.log(`  ✔ [percentage + horário] Happy Hour — 10% em tudo das 18h às 23:59 (prioridade baixa)`)

  // ── 7. Promoção INATIVA (para testar que não aparece) ──────────────

  await prisma.promotion.create({
    data: {
      name: 'Black Friday (desativada)',
      type: 'percentage',
      discountPercent: 50,
      productIds: [],
      startDate: '2026-11-28',
      endDate: '2026-11-30',
      description: 'Black Friday — 50% em tudo. (Só em novembro!)',
      color: '#000000',
      active: false,
      priority: 0,
      storeId: store.id,
    },
  })
  console.log(`  ✔ [inativa] Black Friday — não deve aparecer no catálogo`)

  // ── 8. Promoção com data futura (para testar que não ativa) ────────

  await prisma.promotion.create({
    data: {
      name: 'Natal 2026',
      type: 'percentage',
      discountPercent: 20,
      productIds: [],
      startDate: '2026-12-20',
      endDate: '2026-12-26',
      description: '20% de desconto de Natal em todo o catálogo.',
      color: '#dc2626',
      active: true,
      priority: 0,
      storeId: store.id,
    },
  })
  console.log(`  ✔ [data futura] Natal 2026 — ativa mas fora do período, não deve aparecer`)

  console.log('\n✅ Promoções criadas com sucesso!\n')

  // Resumo por tipo
  const counts = await prisma.promotion.groupBy({
    by: ['type'],
    where: { storeId: store.id },
    _count: true,
  })
  console.log('Resumo:')
  for (const c of counts) {
    console.log(`  ${c.type}: ${c._count} promoções`)
  }
  console.log()
}

main()
  .catch((error) => {
    console.error('Erro:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
