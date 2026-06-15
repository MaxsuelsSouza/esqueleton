// Script que adiciona variantes a todos os produtos cadastrados
// Execute com: cd apps/api && npx tsx prisma/seed-variants.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type VariantDef = {
  options: Record<string, string>
  price: number
}

// Mapeamento: nome do produto → variantes com opções e preço
const VARIANTS: Record<string, VariantDef[]> = {
  // ── Smartphones ────────────────────────────────────────────────
  'Galaxy S24 Ultra 256GB': [
    { options: { Cor: 'Preto Titânio', Armazenamento: '256GB' }, price: 6299.99 },
    { options: { Cor: 'Preto Titânio', Armazenamento: '512GB' }, price: 7099.99 },
    { options: { Cor: 'Cinza Titânio', Armazenamento: '256GB' }, price: 6299.99 },
    { options: { Cor: 'Violeta Titânio', Armazenamento: '256GB' }, price: 6299.99 },
    { options: { Cor: 'Amarelo Titânio', Armazenamento: '512GB' }, price: 7099.99 },
  ],
  'Galaxy A55 128GB': [
    { options: { Cor: 'Azul Claro', Armazenamento: '128GB' }, price: 1799.99 },
    { options: { Cor: 'Azul Claro', Armazenamento: '256GB' }, price: 2099.99 },
    { options: { Cor: 'Lilás', Armazenamento: '128GB' }, price: 1799.99 },
    { options: { Cor: 'Preto', Armazenamento: '128GB' }, price: 1799.99 },
  ],
  'Edge 50 Pro 256GB': [
    { options: { Cor: 'Preto', Armazenamento: '256GB' }, price: 2499.99 },
    { options: { Cor: 'Bege', Armazenamento: '256GB' }, price: 2499.99 },
    { options: { Cor: 'Preto', Armazenamento: '512GB' }, price: 2899.99 },
  ],
  'Moto G84 128GB': [
    { options: { Cor: 'Viva Magenta', Armazenamento: '128GB' }, price: 1099.99 },
    { options: { Cor: 'Grafite', Armazenamento: '128GB' }, price: 1099.99 },
    { options: { Cor: 'Grafite', Armazenamento: '256GB' }, price: 1299.99 },
  ],
  'iPhone 15 Pro 256GB': [
    { options: { Cor: 'Titânio Natural', Armazenamento: '256GB' }, price: 8499.99 },
    { options: { Cor: 'Titânio Azul', Armazenamento: '256GB' }, price: 8499.99 },
    { options: { Cor: 'Titânio Branco', Armazenamento: '512GB' }, price: 9999.99 },
    { options: { Cor: 'Titânio Preto', Armazenamento: '1TB' }, price: 11999.99 },
  ],
  'iPhone 15 128GB': [
    { options: { Cor: 'Azul', Armazenamento: '128GB' }, price: 5499.99 },
    { options: { Cor: 'Rosa', Armazenamento: '128GB' }, price: 5499.99 },
    { options: { Cor: 'Amarelo', Armazenamento: '128GB' }, price: 5499.99 },
    { options: { Cor: 'Verde', Armazenamento: '256GB' }, price: 6299.99 },
    { options: { Cor: 'Preto', Armazenamento: '256GB' }, price: 6299.99 },
  ],
  'Redmi 13C 128GB': [
    { options: { Cor: 'Verde', Armazenamento: '128GB' }, price: 699.99 },
    { options: { Cor: 'Preto', Armazenamento: '128GB' }, price: 699.99 },
    { options: { Cor: 'Azul', Armazenamento: '256GB' }, price: 849.99 },
  ],

  // ── Acessórios para Celular ────────────────────────────────────
  'Capa Ultra Hybrid iPhone 15 Pro': [
    { options: { Cor: 'Transparente' }, price: 159.99 },
    { options: { Cor: 'Preto Fosco' }, price: 169.99 },
  ],
  'Capa MagSafe Galaxy S24 Ultra': [
    { options: { Cor: 'Preto' }, price: 79.99 },
    { options: { Cor: 'Azul Marinho' }, price: 79.99 },
    { options: { Cor: 'Transparente' }, price: 69.99 },
  ],
  'Película de Vidro 3D iPhone 15': [
    { options: { Tipo: 'Transparente' }, price: 49.99 },
    { options: { Tipo: 'Privacidade (anti-spy)' }, price: 69.99 },
  ],
  'Suporte Veicular Magnético': [
    { options: { Fixação: 'Saída de ar' }, price: 89.99 },
    { options: { Fixação: 'Painel (ventosa)' }, price: 99.99 },
    { options: { Fixação: 'Painel (adesivo)' }, price: 79.99 },
  ],
  'Pop Socket Original Translúcido': [
    { options: { Cor: 'Transparente' }, price: 49.99 },
    { options: { Cor: 'Rosa' }, price: 49.99 },
    { options: { Cor: 'Preto' }, price: 49.99 },
    { options: { Cor: 'Azul' }, price: 49.99 },
  ],

  // ── Carregadores & Cabos ───────────────────────────────────────
  'Carregador 65W GaN USB-C': [
    { options: { Cor: 'Branco' }, price: 189.99 },
    { options: { Cor: 'Preto' }, price: 189.99 },
  ],
  'Carregador 45W Super Fast Charging': [
    { options: { Cor: 'Branco' }, price: 149.99 },
    { options: { Cor: 'Preto' }, price: 149.99 },
  ],
  'MagSafe Charger 15W': [
    { options: { Cabo: '1 metro' }, price: 299.99 },
    { options: { Cabo: '2 metros' }, price: 349.99 },
  ],
  'Carregador Veicular 30W USB-C + USB-A': [
    { options: { Cor: 'Preto' }, price: 69.99 },
    { options: { Cor: 'Cinza' }, price: 69.99 },
  ],
  'Cabo USB-C para USB-C 100W 2m': [
    { options: { Comprimento: '1 metro' }, price: 59.99 },
    { options: { Comprimento: '2 metros' }, price: 79.99 },
    { options: { Comprimento: '3 metros' }, price: 99.99 },
  ],
  'Power Bank 20000mAh 65W': [
    { options: { Cor: 'Preto' }, price: 299.99 },
    { options: { Cor: 'Branco' }, price: 299.99 },
  ],

  // ── Áudio ──────────────────────────────────────────────────────
  'AirPods Pro 2ª Geração': [
    { options: { Estojo: 'USB-C' }, price: 1799.99 },
    { options: { Estojo: 'Lightning' }, price: 1599.99 },
  ],
  'Galaxy Buds3 Pro': [
    { options: { Cor: 'Prata' }, price: 1099.99 },
    { options: { Cor: 'Branco' }, price: 1099.99 },
  ],
  'Tune 720BT': [
    { options: { Cor: 'Preto' }, price: 349.99 },
    { options: { Cor: 'Azul' }, price: 349.99 },
    { options: { Cor: 'Roxo' }, price: 349.99 },
  ],
  'WH-1000XM5': [
    { options: { Cor: 'Preto' }, price: 1999.99 },
    { options: { Cor: 'Prata' }, price: 1999.99 },
    { options: { Cor: 'Azul Meia-Noite' }, price: 2099.99 },
  ],
  'Caixa Flip 6': [
    { options: { Cor: 'Preto' }, price: 699.99 },
    { options: { Cor: 'Vermelho' }, price: 699.99 },
    { options: { Cor: 'Azul' }, price: 699.99 },
    { options: { Cor: 'Verde' }, price: 699.99 },
    { options: { Cor: 'Rosa' }, price: 699.99 },
  ],
  'Caixa Emberton III': [
    { options: { Cor: 'Preto e Latão' }, price: 1099.99 },
    { options: { Cor: 'Creme' }, price: 1099.99 },
    { options: { Cor: 'Preto' }, price: 1099.99 },
  ],

  // ── Notebooks ──────────────────────────────────────────────────
  'Alienware m16 R2': [
    { options: { Armazenamento: '1TB SSD', RAM: '32GB' }, price: 18999.99 },
    { options: { Armazenamento: '2TB SSD', RAM: '32GB' }, price: 20999.99 },
    { options: { Armazenamento: '2TB SSD', RAM: '64GB' }, price: 22999.99 },
  ],
  'LOQ 15 Intel Arc A530M': [
    { options: { Armazenamento: '512GB SSD', RAM: '16GB' }, price: 3999.99 },
    { options: { Armazenamento: '1TB SSD', RAM: '16GB' }, price: 4499.99 },
  ],
  'MacBook Air M3 13"': [
    { options: { Cor: 'Estelar', Armazenamento: '256GB' }, price: 10499.99 },
    { options: { Cor: 'Meia-Noite', Armazenamento: '256GB' }, price: 10499.99 },
    { options: { Cor: 'Prateado', Armazenamento: '512GB' }, price: 12499.99 },
    { options: { Cor: 'Estelar', Armazenamento: '512GB' }, price: 12499.99 },
  ],
  'XPS 13 Plus': [
    { options: { Cor: 'Prata', Armazenamento: '512GB' }, price: 9999.99 },
    { options: { Cor: 'Grafite', Armazenamento: '512GB' }, price: 9999.99 },
    { options: { Cor: 'Grafite', Armazenamento: '1TB' }, price: 11499.99 },
  ],
  'Aspire 5 Core i5 8GB 512GB': [
    { options: { RAM: '8GB', Armazenamento: '512GB' }, price: 2499.99 },
    { options: { RAM: '16GB', Armazenamento: '512GB' }, price: 2799.99 },
  ],

  // ── Acessórios para Notebook ───────────────────────────────────
  'MX Master 3S': [
    { options: { Cor: 'Grafite' }, price: 599.99 },
    { options: { Cor: 'Cinza Claro' }, price: 599.99 },
  ],
  'Teclado MX Keys S': [
    { options: { Cor: 'Grafite' }, price: 699.99 },
    { options: { Cor: 'Cinza Claro' }, price: 699.99 },
  ],
  'Mochila CityLite Pro 15.6"': [
    { options: { Cor: 'Preto' }, price: 349.99 },
    { options: { Cor: 'Cinza' }, price: 349.99 },
  ],
  'Hub USB-C 9 em 1': [
    { options: { Cor: 'Cinza Espacial' }, price: 199.99 },
    { options: { Cor: 'Prata' }, price: 199.99 },
  ],

  // ── Tablets ────────────────────────────────────────────────────
  'Galaxy Tab S9 FE 128GB': [
    { options: { Cor: 'Grafite', Armazenamento: '128GB' }, price: 1999.99 },
    { options: { Cor: 'Prata', Armazenamento: '128GB' }, price: 1999.99 },
    { options: { Cor: 'Lavanda', Armazenamento: '256GB' }, price: 2399.99 },
  ],
  'iPad Air M2 11" 128GB': [
    { options: { Cor: 'Estelar', Armazenamento: '128GB' }, price: 5499.99 },
    { options: { Cor: 'Azul', Armazenamento: '128GB' }, price: 5499.99 },
    { options: { Cor: 'Roxo', Armazenamento: '256GB' }, price: 6499.99 },
    { options: { Cor: 'Estelar', Armazenamento: '256GB' }, price: 6499.99 },
  ],

  // ── Smartwatch & Pulseiras ─────────────────────────────────────
  'Apple Watch Series 10 45mm': [
    { options: { Cor: 'Alumínio Preto', Tamanho: '42mm' }, price: 3499.99 },
    { options: { Cor: 'Alumínio Preto', Tamanho: '46mm' }, price: 3999.99 },
    { options: { Cor: 'Alumínio Prata', Tamanho: '42mm' }, price: 3499.99 },
    { options: { Cor: 'Alumínio Rosa', Tamanho: '46mm' }, price: 3999.99 },
  ],
  'Galaxy Watch 7 44mm': [
    { options: { Cor: 'Verde', Tamanho: '40mm' }, price: 1499.99 },
    { options: { Cor: 'Verde', Tamanho: '44mm' }, price: 1799.99 },
    { options: { Cor: 'Prata', Tamanho: '44mm' }, price: 1799.99 },
    { options: { Cor: 'Creme', Tamanho: '40mm' }, price: 1499.99 },
  ],
  'Smart Band 9': [
    { options: { Cor: 'Preto' }, price: 249.99 },
    { options: { Cor: 'Azul' }, price: 249.99 },
    { options: { Cor: 'Rosa' }, price: 249.99 },
    { options: { Cor: 'Prata' }, price: 259.99 },
  ],

  // ── Games & Consoles ───────────────────────────────────────────
  'PlayStation 5 Slim': [
    { options: { Modelo: 'Com disco' }, price: 3799.99 },
    { options: { Modelo: 'Digital (sem disco)' }, price: 3299.99 },
  ],
  'Xbox Series X': [
    { options: { Modelo: 'Series X (1TB)' }, price: 3499.99 },
    { options: { Modelo: 'Series S (512GB)' }, price: 1999.99 },
    { options: { Modelo: 'Series X (2TB, edição especial)' }, price: 4299.99 },
  ],
  'Controle DualSense PS5': [
    { options: { Cor: 'Branco' }, price: 449.99 },
    { options: { Cor: 'Preto Meia-Noite' }, price: 449.99 },
    { options: { Cor: 'Vermelho Cósmico' }, price: 469.99 },
    { options: { Cor: 'Azul Estelar' }, price: 469.99 },
    { options: { Cor: 'Roxo Galáctico' }, price: 469.99 },
  ],
  'Cloud Alpha Wireless': [
    { options: { Cor: 'Preto/Vermelho' }, price: 899.99 },
    { options: { Cor: 'Preto' }, price: 899.99 },
  ],
  'Cadeira TC200 Leatherette': [
    { options: { Cor: 'Preto', Material: 'Couro sintético' }, price: 1499.99 },
    { options: { Cor: 'Preto/Branco', Material: 'Couro sintético' }, price: 1499.99 },
    { options: { Cor: 'Cinza', Material: 'Tecido' }, price: 1599.99 },
  ],

  // ── Redes & Conectividade ──────────────────────────────────────
  'Roteador Archer AX3000 Wi-Fi 6': [
    { options: { Modelo: 'AX3000 (Wi-Fi 6)' }, price: 349.99 },
    { options: { Modelo: 'AX5400 (Wi-Fi 6)' }, price: 499.99 },
  ],
  'Repetidor Wi-Fi RE330 AC1200': [
    { options: { Modelo: 'RE330 (AC1200)' }, price: 149.99 },
    { options: { Modelo: 'RE505X (AX1500 Wi-Fi 6)' }, price: 229.99 },
  ],

  // ── TV & Vídeo ─────────────────────────────────────────────────
  'Smart TV QLED 55" 4K Q60D': [
    { options: { Tamanho: '50"' }, price: 2799.99 },
    { options: { Tamanho: '55"' }, price: 3199.99 },
    { options: { Tamanho: '65"' }, price: 4299.99 },
    { options: { Tamanho: '75"' }, price: 5999.99 },
  ],
  'Chromecast com Google TV 4K': [
    { options: { Modelo: '4K (HDR)' }, price: 299.99 },
    { options: { Modelo: 'HD' }, price: 199.99 },
  ],
  'Fire TV Stick 4K Max': [
    { options: { Modelo: '4K Max (Wi-Fi 6E)' }, price: 399.99 },
    { options: { Modelo: '4K' }, price: 329.99 },
    { options: { Modelo: 'Lite (Full HD)' }, price: 229.99 },
  ],

  // ── Foto & Vídeo ───────────────────────────────────────────────
  'Drone Mini 4 Pro': [
    { options: { Kit: 'Básico (1 bateria)' }, price: 5999.99 },
    { options: { Kit: 'Fly More (3 baterias + case)' }, price: 7999.99 },
    { options: { Kit: 'Fly More + DJI RC 2' }, price: 8999.99 },
  ],
  'HERO13 Black': [
    { options: { Kit: 'Apenas câmera' }, price: 2499.99 },
    { options: { Kit: 'Creator Edition (microfone + luz + grip)' }, price: 3499.99 },
  ],
  'GorillaPod 3K Kit': [
    { options: { Modelo: '1K (até 1kg)' }, price: 199.99 },
    { options: { Modelo: '3K (até 3kg)' }, price: 299.99 },
    { options: { Modelo: '5K (até 5kg)' }, price: 449.99 },
  ],
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, storeId: true },
  })

  console.log(`\nEncontrados ${products.length} produtos no banco.\n`)

  let atualizados = 0
  let semVariantes = 0

  for (const product of products) {
    const defs = VARIANTS[product.name]
    if (!defs) {
      console.log(`  ⚠ Sem variantes definidas: ${product.name}`)
      semVariantes++
      continue
    }

    // Remove variantes anteriores do produto (para poder rodar novamente)
    await prisma.productVariant.deleteMany({
      where: { productId: product.id, storeId: product.storeId },
    })

    // Cria as novas variantes
    await prisma.productVariant.createMany({
      data: defs.map((v) => ({
        productId: product.id,
        storeId: product.storeId,
        options: v.options,
        price: v.price,
        active: true,
      })),
    })

    console.log(`  ✔ ${product.name} (${defs.length} variantes)`)
    atualizados++
  }

  console.log(`\n✅ ${atualizados} produtos atualizados, ${semVariantes} sem variantes definidas.\n`)
}

main()
  .catch((error) => {
    console.error('Erro:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
