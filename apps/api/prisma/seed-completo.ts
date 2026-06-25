// Script de seed completo — cria usuário, categorias, produtos com imagens
// Execute com: cd apps/api && npx tsx prisma/seed-completo.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()
const DOWNLOADS = 'C:/Users/maxsu/Downloads'

// Converte um arquivo de imagem para base64 data URI
function imageToBase64(filename: string): string | null {
  const filepath = path.join(DOWNLOADS, filename)
  if (!fs.existsSync(filepath)) {
    console.warn(`  ⚠ Imagem não encontrada: ${filename}`)
    return null
  }
  const buffer = fs.readFileSync(filepath)
  const ext = path.extname(filename).toLowerCase().replace('.', '')
  const mime = ext === 'jpg' ? 'jpeg' : ext
  return `data:image/${mime};base64,${buffer.toString('base64')}`
}

// Mapeamento: índice do produto (1-based) → arquivo de imagem
const IMAGE_MAP: Record<number, string> = {
  1:  '300Wx300H-productCard-18881-zero.png',
  2:  'images.jpg',
  3:  'frente-traseira-smartphone-motorola-edge-50-pro-black-silicon-certo.png',
  4:  'frente-smartphone-moto-g84-viva-magenta-vegan-leather-1.png',
  5:  'images (1).jpg',
  6:  '300Wx300H-productCard-18777-zero.png',
  7:  'images (44).jpg',
  8:  'images (43).jpg',
  9:  'images (42).jpg',
  10: 'images (41).jpg',
  11: 'images (40).jpg',
  12: 'b96cdd5b-0f20-4211-b62a-54400f7fac9c.__CR0,0,150,300_PT0_SX150_V1___.jpg',
  13: 'images (39).jpg',
  14: 'images (38).jpg',
  15: 'images (37).jpg',
  16: 'images (36).jpg',
  17: 'images (35).jpg',
  18: 'images (34).jpg',
  19: 'images (33).jpg',
  20: 'images (32).jpg',
  21: 'images (31).jpg',
  22: 'images (30).jpg',
  23: 'images (29).jpg',
  24: 'images (28).jpg',
  25: 'images (27).jpg',
  26: 'images (26).jpg',
  27: 'images (25).jpg',
  28: 'images (24).jpg',
  29: 'images (23).jpg',
  30: 'images (22).jpg',
  31: 'images (21).jpg',
  32: 'images (20).jpg',
  33: 'images (19).jpg',
  34: 'images (18).jpg',
  35: 'images (17).jpg',
  36: 'images (16).jpg',
  37: 'images (15).jpg',
  38: 'images (14).jpg',
  39: 'images (13).jpg',
  40: 'images (12).jpg',
  41: 'images (11).jpg',
  42: 'images (10).jpg',
  43: 'images (9).jpg',
  44: 'images (8).jpg',
  45: 'images (7).jpg',
  46: 'images (6).jpg',
  47: 'images (5).jpg',
  48: 'i802467.png',
  49: 'images (4).jpg',
  50: 'images (3).jpg',
  51: 'images (2).jpg',
}

// Categorias com subcategorias
const CATEGORIAS = [
  { name: 'Smartphones', filhos: ['Android', 'iPhone', 'Básicos'] },
  { name: 'Acessórios para Celular', filhos: ['Capinhas', 'Películas', 'Suportes & Apoios', 'Pop Socket'] },
  { name: 'Carregadores & Cabos', filhos: ['Carregamento Turbo', 'Carregamento sem fio', 'Veicular', 'Cabos USB', 'Power Bank'] },
  { name: 'Áudio', filhos: ['Fones sem fio (TWS)', 'Fones com fio', 'Headphones', 'Caixas de som Bluetooth'] },
  { name: 'Notebooks', filhos: ['Gamer', 'Ultrafino', 'Custo-benefício'] },
  { name: 'Acessórios para Notebook', filhos: ['Mouses', 'Teclados', 'Mochilas & Cases', 'Hubs & Adaptadores'] },
  { name: 'Tablets', filhos: ['Android', 'iPad'] },
  { name: 'Smartwatch & Pulseiras', filhos: ['Android Wear', 'Apple Watch', 'Pulseiras fitness'] },
  { name: 'Games & Consoles', filhos: ['Consoles', 'Controles', 'Headset Gamer', 'Cadeiras Gamer'] },
  { name: 'Redes & Conectividade', filhos: ['Roteadores', 'Repetidores Wi-Fi', 'Switches'] },
  { name: 'TV & Vídeo', filhos: ['Smart TV', 'Streaming (Chromecast, Fire TV)', 'Projetores'] },
  { name: 'Foto & Vídeo', filhos: ['Câmeras', 'Drones', 'Tripés & Acessórios'] },
]

// Produtos com índice, categorias e dados
type ProdutoDef = {
  index: number
  brand: string
  name: string
  description: string
  price: number
  categorias: string[]
}

const PRODUTOS: ProdutoDef[] = [
  { index: 1, brand: 'Samsung', name: 'Galaxy S24 Ultra 256GB', description: 'Smartphone premium com câmera de 200MP, S Pen integrada, tela Dynamic AMOLED 2X de 6,8" e processador Snapdragon 8 Gen 3.', price: 6299.99, categorias: ['Smartphones', 'Android'] },
  { index: 2, brand: 'Samsung', name: 'Galaxy A55 128GB', description: 'Smartphone intermediário com tela Super AMOLED de 6,6", câmera tripla de 50MP e bateria de 5000mAh.', price: 1799.99, categorias: ['Smartphones', 'Android'] },
  { index: 3, brand: 'Motorola', name: 'Edge 50 Pro 256GB', description: 'Design fino com tela pOLED de 6,7", câmera de 50MP com OIS e carregamento turbo de 125W.', price: 2499.99, categorias: ['Smartphones', 'Android'] },
  { index: 4, brand: 'Motorola', name: 'Moto G84 128GB', description: 'Tela pOLED de 6,5", câmera de 50MP, bateria de 5000mAh e carregamento de 33W.', price: 1099.99, categorias: ['Smartphones', 'Android'] },
  { index: 5, brand: 'Apple', name: 'iPhone 15 Pro 256GB', description: 'Carcaça em titânio, chip A17 Pro, câmera de 48MP com zoom óptico 5x e botão de ação personalizável.', price: 8499.99, categorias: ['Smartphones', 'iPhone'] },
  { index: 6, brand: 'Apple', name: 'iPhone 15 128GB', description: 'Chip A16 Bionic, câmera principal de 48MP, Dynamic Island e conector USB-C.', price: 5499.99, categorias: ['Smartphones', 'iPhone'] },
  { index: 7, brand: 'Xiaomi', name: 'Redmi 13C 128GB', description: 'Smartphone básico com tela de 6,74", câmera de 50MP e bateria de 5000mAh. Ótimo custo-benefício.', price: 699.99, categorias: ['Smartphones', 'Básicos'] },
  { index: 8, brand: 'Spigen', name: 'Capa Ultra Hybrid iPhone 15 Pro', description: 'Capa transparente com bordas reforçadas em TPU e painel traseiro rígido. Proteção contra quedas com visual clean.', price: 159.99, categorias: ['Acessórios para Celular', 'Capinhas'] },
  { index: 9, brand: 'Capinha Store', name: 'Capa MagSafe Galaxy S24 Ultra', description: 'Capa slim compatível com MagSafe, material em policarbonato fosco, bordas em silicone.', price: 79.99, categorias: ['Acessórios para Celular', 'Capinhas'] },
  { index: 10, brand: 'Baseus', name: 'Película de Vidro 3D iPhone 15', description: 'Vidro temperado 9H com cobertura total da tela, bordas curvas e instalação sem bolhas.', price: 49.99, categorias: ['Acessórios para Celular', 'Películas'] },
  { index: 11, brand: 'Baseus', name: 'Suporte Veicular Magnético', description: 'Suporte de celular para carro com fixação magnética potente, compatível com MagSafe e todas as marcas.', price: 89.99, categorias: ['Acessórios para Celular', 'Suportes & Apoios'] },
  { index: 12, brand: 'PopSockets', name: 'Pop Socket Original Translúcido', description: 'Suporte e apoio para selfies com base adesiva reutilizável. Design translúcido minimalista.', price: 49.99, categorias: ['Acessórios para Celular', 'Pop Socket'] },
  { index: 13, brand: 'Anker', name: 'Carregador 65W GaN USB-C', description: 'Carregador compacto GaN de 65W com uma porta USB-C e uma USB-A. Compatível com notebooks, tablets e celulares.', price: 189.99, categorias: ['Carregadores & Cabos', 'Carregamento Turbo'] },
  { index: 14, brand: 'Samsung', name: 'Carregador 45W Super Fast Charging', description: 'Carregador original Samsung de 45W para Galaxy S e Note. Inclui cabo USB-C.', price: 149.99, categorias: ['Carregadores & Cabos', 'Carregamento Turbo'] },
  { index: 15, brand: 'Apple', name: 'MagSafe Charger 15W', description: 'Carregador sem fio magnético oficial Apple de 15W para iPhone 12 ou mais recente.', price: 299.99, categorias: ['Carregadores & Cabos', 'Carregamento sem fio'] },
  { index: 16, brand: 'Baseus', name: 'Carregador Veicular 30W USB-C + USB-A', description: 'Carregador para carro com duas portas (USB-C 30W e USB-A 18W), design compacto e LED indicador.', price: 69.99, categorias: ['Carregadores & Cabos', 'Veicular'] },
  { index: 17, brand: 'Anker', name: 'Cabo USB-C para USB-C 100W 2m', description: 'Cabo reforçado em nylon trançado, suporta carregamento de 100W e transferência de dados USB 3.1.', price: 79.99, categorias: ['Carregadores & Cabos', 'Cabos USB'] },
  { index: 18, brand: 'Baseus', name: 'Power Bank 20000mAh 65W', description: 'Bateria portátil de alta capacidade com saída de 65W, suporta carregamento de notebook e dois dispositivos ao mesmo tempo.', price: 299.99, categorias: ['Carregadores & Cabos', 'Power Bank'] },
  { index: 19, brand: 'Apple', name: 'AirPods Pro 2ª Geração', description: 'Cancelamento de ruído ativo adaptativo, Áudio Espacial personalizado, resistência à água IPX4 e estojo com carga USB-C.', price: 1799.99, categorias: ['Áudio', 'Fones sem fio (TWS)'] },
  { index: 20, brand: 'Samsung', name: 'Galaxy Buds3 Pro', description: 'TWS premium com cancelamento de ruído inteligente, som Hi-Fi e design ergonômico com hastes.', price: 1099.99, categorias: ['Áudio', 'Fones sem fio (TWS)'] },
  { index: 21, brand: 'JBL', name: 'Tune 720BT', description: 'Headphone over-ear sem fio com até 76h de bateria, dobrável e som JBL Pure Bass.', price: 349.99, categorias: ['Áudio', 'Headphones'] },
  { index: 22, brand: 'Sony', name: 'WH-1000XM5', description: 'Headphone premium com melhor cancelamento de ruído da categoria, 30h de bateria e microfone com IA.', price: 1999.99, categorias: ['Áudio', 'Headphones'] },
  { index: 23, brand: 'JBL', name: 'Caixa Flip 6', description: 'Caixa portátil à prova d\'água IP67, som estéreo com baixo potente, 12h de bateria e conexão PartyBoost.', price: 699.99, categorias: ['Áudio', 'Caixas de som Bluetooth'] },
  { index: 24, brand: 'Marshall', name: 'Caixa Emberton III', description: 'Design icônico retrô, IP67, 32h de bateria e som 360° com assinatura Marshall.', price: 1099.99, categorias: ['Áudio', 'Caixas de som Bluetooth'] },
  { index: 25, brand: 'Dell', name: 'Alienware m16 R2', description: 'Notebook gamer com Intel Core i9-14900HX, RTX 4080 16GB, 32GB RAM, SSD 1TB e tela QHD+ 240Hz.', price: 18999.99, categorias: ['Notebooks', 'Gamer'] },
  { index: 26, brand: 'Lenovo', name: 'LOQ 15 Intel Arc A530M', description: 'Gamer de entrada com Core i5-12450HX, 16GB RAM, SSD 512GB e tela FHD 144Hz.', price: 3999.99, categorias: ['Notebooks', 'Gamer'] },
  { index: 27, brand: 'Apple', name: 'MacBook Air M3 13"', description: 'Chip M3, 8GB RAM, SSD 256GB, tela Liquid Retina, até 18h de bateria. O ultrafino mais avançado.', price: 10499.99, categorias: ['Notebooks', 'Ultrafino'] },
  { index: 28, brand: 'Dell', name: 'XPS 13 Plus', description: 'Ultra-slim com Intel Core Ultra 7, 16GB RAM, SSD 512GB e tela OLED 3,5K de 13,4".', price: 9999.99, categorias: ['Notebooks', 'Ultrafino'] },
  { index: 29, brand: 'Acer', name: 'Aspire 5 Core i5 8GB 512GB', description: 'Notebook custo-benefício para trabalho e estudos, com tela Full HD de 15,6" e SSD rápido.', price: 2499.99, categorias: ['Notebooks', 'Custo-benefício'] },
  { index: 30, brand: 'Logitech', name: 'MX Master 3S', description: 'Mouse sem fio premium com sensor de 8000 DPI, scroll MagSpeed silencioso e até 70 dias de bateria.', price: 599.99, categorias: ['Acessórios para Notebook', 'Mouses'] },
  { index: 31, brand: 'Logitech', name: 'Teclado MX Keys S', description: 'Teclado sem fio inteligente com retroiluminação adaptativa, perfil de tecla esférica e bateria de 10 dias.', price: 699.99, categorias: ['Acessórios para Notebook', 'Teclados'] },
  { index: 32, brand: 'Targus', name: 'Mochila CityLite Pro 15.6"', description: 'Mochila executiva com compartimento acolchoado para notebook, porta USB externa e material resistente à água.', price: 349.99, categorias: ['Acessórios para Notebook', 'Mochilas & Cases'] },
  { index: 33, brand: 'Baseus', name: 'Hub USB-C 9 em 1', description: 'Dock com HDMI 4K, 3x USB-A 3.0, USB-C 100W PD, leitor SD/MicroSD e porta Ethernet Gigabit.', price: 199.99, categorias: ['Acessórios para Notebook', 'Hubs & Adaptadores'] },
  { index: 34, brand: 'Samsung', name: 'Galaxy Tab S9 FE 128GB', description: 'Tablet Android com tela TFT de 10,9", S Pen incluída, câmera de 8MP e bateria de 8000mAh.', price: 1999.99, categorias: ['Tablets', 'Android'] },
  { index: 35, brand: 'Apple', name: 'iPad Air M2 11" 128GB', description: 'Chip M2, tela Liquid Retina de 11", compatível com Apple Pencil Pro e Magic Keyboard.', price: 5499.99, categorias: ['Tablets', 'iPad'] },
  { index: 36, brand: 'Apple', name: 'Apple Watch Series 10 45mm', description: 'O Apple Watch mais fino, tela sempre ativa maior, detecção de apneia do sono e carregamento rápido.', price: 3999.99, categorias: ['Smartwatch & Pulseiras', 'Apple Watch'] },
  { index: 37, brand: 'Samsung', name: 'Galaxy Watch 7 44mm', description: 'Smartwatch Android com monitoramento avançado de saúde, BioActive Sensor e até 40h de bateria.', price: 1799.99, categorias: ['Smartwatch & Pulseiras', 'Android Wear'] },
  { index: 38, brand: 'Xiaomi', name: 'Smart Band 9', description: 'Pulseira fitness ultraleve com tela AMOLED, 150+ modos esportivos, SpO2 e até 21 dias de bateria.', price: 249.99, categorias: ['Smartwatch & Pulseiras', 'Pulseiras fitness'] },
  { index: 39, brand: 'Sony', name: 'PlayStation 5 Slim', description: 'Console de última geração com SSD ultra-rápido, 4K a 120fps, ray tracing e leitor de disco.', price: 3799.99, categorias: ['Games & Consoles', 'Consoles'] },
  { index: 40, brand: 'Microsoft', name: 'Xbox Series X', description: 'Console 4K 60fps com retrocompatibilidade, Game Pass e Quick Resume para múltiplos jogos.', price: 3499.99, categorias: ['Games & Consoles', 'Consoles'] },
  { index: 41, brand: 'Sony', name: 'Controle DualSense PS5', description: 'Controle com feedback háptico, gatilhos adaptáveis e microfone integrado. Compatível com PS5 e PC.', price: 449.99, categorias: ['Games & Consoles', 'Controles'] },
  { index: 42, brand: 'HyperX', name: 'Cloud Alpha Wireless', description: 'Headset gamer sem fio com até 300h de bateria, cancelamento de ruído e som surround virtual.', price: 899.99, categorias: ['Games & Consoles', 'Headset Gamer'] },
  { index: 43, brand: 'Corsair', name: 'Cadeira TC200 Leatherette', description: 'Cadeira gamer com apoio lombar ajustável, braços 4D, inclinação de até 165° e revestimento em couro sintético.', price: 1499.99, categorias: ['Games & Consoles', 'Cadeiras Gamer'] },
  { index: 44, brand: 'TP-Link', name: 'Roteador Archer AX3000 Wi-Fi 6', description: 'Roteador dual band AX3000 com Wi-Fi 6, 4 antenas e cobertura para casas de até 250m².', price: 349.99, categorias: ['Redes & Conectividade', 'Roteadores'] },
  { index: 45, brand: 'TP-Link', name: 'Repetidor Wi-Fi RE330 AC1200', description: 'Expande a rede Wi-Fi em até 90m², dual band AC1200 e porta LAN para conexão cabeada.', price: 149.99, categorias: ['Redes & Conectividade', 'Repetidores Wi-Fi'] },
  { index: 46, brand: 'Samsung', name: 'Smart TV QLED 55" 4K Q60D', description: 'Painel QLED com Quantum Processor 4K Lite, sistema Tizen, Alexa integrada e HDMI 2.1.', price: 3199.99, categorias: ['TV & Vídeo', 'Smart TV'] },
  { index: 47, brand: 'Google', name: 'Chromecast com Google TV 4K', description: 'Transforma qualquer TV em Smart TV com Google TV, suporte a 4K HDR e controle de voz.', price: 299.99, categorias: ['TV & Vídeo', 'Streaming (Chromecast, Fire TV)'] },
  { index: 48, brand: 'Amazon', name: 'Fire TV Stick 4K Max', description: 'Streaming 4K com Wi-Fi 6E, Alexa e acesso a Prime Video, Netflix, Disney+ e mais.', price: 399.99, categorias: ['TV & Vídeo', 'Streaming (Chromecast, Fire TV)'] },
  { index: 49, brand: 'DJI', name: 'Drone Mini 4 Pro', description: 'Drone dobrável com câmera 4K/60fps, autonomia de 34 min, obstáculos em todas as direções e transmissão a 20km.', price: 5999.99, categorias: ['Foto & Vídeo', 'Drones'] },
  { index: 50, brand: 'GoPro', name: 'HERO13 Black', description: 'Câmera de ação à prova d\'água, vídeo 5.3K, foto de 27MP, HyperSmooth 6.0 e tela frontal.', price: 2499.99, categorias: ['Foto & Vídeo', 'Câmeras'] },
  { index: 51, brand: 'Joby', name: 'GorillaPod 3K Kit', description: 'Tripé flexível e dobrável suporta até 3kg, compatível com câmeras mirrorless, ação e smartphones.', price: 299.99, categorias: ['Foto & Vídeo', 'Tripés & Acessórios'] },
]

async function main() {
  // Busca a loja existente
  const store = await prisma.store.findFirst()
  if (!store) {
    console.error('Nenhuma loja encontrada. Crie uma loja primeiro via /admin/login → "Criar minha loja".')
    process.exit(1)
  }
  console.log(`\nUsando loja: ${store.name} (${store.slug})\n`)

  // Recria o usuário admin se não existir
  const existingUser = await prisma.user.findUnique({ where: { email: 'maxsuelsouza@gmail.com' } })
  if (!existingUser) {
    const hash = await bcrypt.hash('12345678', 10)
    await prisma.user.create({
      data: { email: 'maxsuelsouza@gmail.com', password: hash, storeId: store.id },
    })
    console.log('✔ Usuário maxsuelsouza@gmail.com criado (senha: 12345678)\n')
  } else {
    console.log('✔ Usuário maxsuelsouza@gmail.com já existe\n')
  }

  // ── Categorias ─────────────────────────────────────────────────
  console.log('Inserindo categorias...\n')
  const catMap: Record<string, string> = {}

  for (const categoria of CATEGORIAS) {
    const pai = await prisma.category.create({
      data: { name: categoria.name, storeId: store.id },
    })
    catMap[categoria.name] = pai.id
    console.log(`  ✔ ${categoria.name}`)

    for (const nomeFilho of categoria.filhos) {
      const filho = await prisma.category.create({
        data: { name: nomeFilho, parentId: pai.id, storeId: store.id },
      })
      catMap[nomeFilho] = filho.id
      console.log(`      └─ ${nomeFilho}`)
    }
  }

  // ── Produtos com imagens ───────────────────────────────────────
  console.log('\nInserindo produtos com imagens...\n')

  // Mapeia índice do produto → id gerado no banco (para vincular promoções, cupons e destaques)
  const productIdMap: Record<number, string> = {}

  for (const prod of PRODUTOS) {
    const imageFile = IMAGE_MAP[prod.index]
    const imageUrl = imageFile ? imageToBase64(imageFile) : null

    const produto = await prisma.product.create({
      data: {
        brand: prod.brand,
        name: prod.name,
        description: prod.description,
        price: prod.price,
        imageUrl,
        storeId: store.id,
        categories: {
          create: prod.categorias
            .filter((nome) => catMap[nome])
            .map((nome) => ({ categoryId: catMap[nome] })),
        },
      },
    })
    productIdMap[prod.index] = produto.id
    console.log(`  ✔ [${prod.index}] ${prod.brand} ${prod.name} ${imageUrl ? '📷' : '⚠ sem imagem'}`)
  }

  // ── Promoções ────────────────────────────────────────────────────
  console.log('\nInserindo promoções...\n')

  // Promoção 1: Desconto de 15% em Smartphones Samsung
  await prisma.promotion.create({
    data: {
      name: 'Samsung Week',
      type: 'desconto',
      discountPercent: 15,
      productIds: [productIdMap[1], productIdMap[2]].filter(Boolean),
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      description: 'Até 15% de desconto em smartphones Samsung selecionados.',
      color: '#1428a0',
      active: true,
      priority: 1,
      storeId: store.id,
    },
  })
  console.log('  ✔ Samsung Week (15% em smartphones Samsung)')

  // Promoção 2: Desconto fixo de R$200 em Notebooks
  await prisma.promotion.create({
    data: {
      name: 'Mega Oferta Notebooks',
      type: 'desconto',
      discountValue: 200,
      productIds: [productIdMap[25], productIdMap[26], productIdMap[27], productIdMap[28], productIdMap[29]].filter(Boolean),
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      description: 'R$200 de desconto em notebooks selecionados.',
      color: '#16a34a',
      active: true,
      priority: 2,
      storeId: store.id,
    },
  })
  console.log('  ✔ Mega Oferta Notebooks (R$200 off)')

  // Promoção 3: Kit Áudio — preço especial para combo
  await prisma.promotion.create({
    data: {
      name: 'Combo Áudio Premium',
      type: 'kit',
      kitPrice: 2199.99,
      productIds: [productIdMap[22], productIdMap[23]].filter(Boolean),
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      description: 'Leve o headphone Sony WH-1000XM5 + JBL Flip 6 por um preço especial.',
      color: '#7c3aed',
      active: true,
      priority: 3,
      storeId: store.id,
    },
  })
  console.log('  ✔ Combo Áudio Premium (kit por R$2.199,99)')

  // Promoção 4: Compre 2 leve 3 em acessórios para celular
  await prisma.promotion.create({
    data: {
      name: 'Compre 2 Leve 3 Acessórios',
      type: 'compre_x_leve_y',
      buyQuantity: 2,
      getQuantity: 3,
      productIds: [productIdMap[8], productIdMap[9], productIdMap[10], productIdMap[11], productIdMap[12]].filter(Boolean),
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      description: 'Na compra de 2 acessórios para celular, leve 3.',
      color: '#f97316',
      active: true,
      priority: 4,
      storeId: store.id,
    },
  })
  console.log('  ✔ Compre 2 Leve 3 Acessórios')

  // Promoção 5: Happy Hour — desconto por horário
  await prisma.promotion.create({
    data: {
      name: 'Happy Hour Tech',
      type: 'horario',
      discountPercent: 10,
      productIds: [],
      startTime: '18:00',
      endTime: '22:00',
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      description: '10% de desconto em todo o catálogo das 18h às 22h.',
      color: '#ec4899',
      active: true,
      priority: 5,
      storeId: store.id,
    },
  })
  console.log('  ✔ Happy Hour Tech (10% das 18h às 22h)')

  // ── Cupons ───────────────────────────────────────────────────────
  console.log('\nInserindo cupons...\n')

  await prisma.coupon.create({
    data: {
      code: 'BEMVINDO10',
      description: 'Cupom de boas-vindas: 10% de desconto na primeira compra.',
      discountType: 'percentage',
      discountPercent: 10,
      maxUses: 500,
      productIds: [],
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      active: true,
      storeId: store.id,
    },
  })
  console.log('  ✔ BEMVINDO10 (10% off, 500 usos)')

  await prisma.coupon.create({
    data: {
      code: 'FRETE50',
      description: 'R$50 de desconto para pedidos acima de R$300.',
      discountType: 'fixed',
      discountValue: 50,
      minimumOrderValue: 300,
      maxUses: 200,
      productIds: [],
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      active: true,
      storeId: store.id,
    },
  })
  console.log('  ✔ FRETE50 (R$50 off, pedido mínimo R$300)')

  await prisma.coupon.create({
    data: {
      code: 'APPLE20',
      description: '20% de desconto em produtos Apple selecionados.',
      discountType: 'percentage',
      discountPercent: 20,
      maxUses: 100,
      productIds: [productIdMap[5], productIdMap[6], productIdMap[19], productIdMap[27], productIdMap[35], productIdMap[36]].filter(Boolean),
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      active: true,
      storeId: store.id,
    },
  })
  console.log('  ✔ APPLE20 (20% off em produtos Apple)')

  await prisma.coupon.create({
    data: {
      code: 'GAMER100',
      description: 'R$100 de desconto em Games & Consoles.',
      discountType: 'fixed',
      discountValue: 100,
      minimumOrderValue: 500,
      maxUses: 150,
      productIds: [productIdMap[39], productIdMap[40], productIdMap[41], productIdMap[42], productIdMap[43]].filter(Boolean),
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      active: true,
      storeId: store.id,
    },
  })
  console.log('  ✔ GAMER100 (R$100 off em games)')

  await prisma.coupon.create({
    data: {
      code: 'AUDIO15',
      description: '15% de desconto em fones e caixas de som.',
      discountType: 'percentage',
      discountPercent: 15,
      maxUses: 200,
      productIds: [productIdMap[19], productIdMap[20], productIdMap[21], productIdMap[22], productIdMap[23], productIdMap[24]].filter(Boolean),
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      active: true,
      storeId: store.id,
    },
  })
  console.log('  ✔ AUDIO15 (15% off em áudio)')

  // ── Seção em destaque ────────────────────────────────────────────
  console.log('\nInserindo seção em destaque...\n')

  await prisma.featured.create({
    data: {
      title: 'Mais Vendidos da Semana',
      tag: 'Destaque',
      productIds: [productIdMap[1], productIdMap[5], productIdMap[22], productIdMap[39], productIdMap[27], productIdMap[19]].filter(Boolean),
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      active: true,
      carousel: true,
      storeId: store.id,
    },
  })
  console.log('  ✔ Mais Vendidos da Semana (carrossel)')

  console.log('\n✅ Seed completo! Produtos, categorias, promoções, cupons e destaques inseridos.\n')
}

main()
  .catch((error) => {
    console.error('Erro:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
