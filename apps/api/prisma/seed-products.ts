// Script de seed — insere produtos de demonstração de loja de eletrônicos
// Execute com: npx ts-node prisma/seed-products.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Busca todas as categorias do banco para mapear nome → id
  const todasCategorias = await prisma.category.findMany()
  const cat = Object.fromEntries(todasCategorias.map((c) => [c.name, c.id]))

  // Função auxiliar: cria produto e vincula às categorias informadas
  async function criarProduto(dados: {
    brand: string
    name: string
    description: string
    price: number
    originalPrice?: number
    stock: number
    categorias: string[]
  }) {
    const produto = await prisma.product.create({
      data: {
        brand: dados.brand,
        name: dados.name,
        description: dados.description,
        price: dados.price,
        originalPrice: dados.originalPrice ?? null,
        stock: dados.stock,
        categories: {
          create: dados.categorias
            .filter((nome) => cat[nome])
            .map((nome) => ({ categoryId: cat[nome] })),
        },
      },
    })
    console.log(`  ✔ ${dados.brand} ${dados.name}`)
    return produto
  }

  console.log('\n📱 Smartphones\n')

  await criarProduto({
    brand: 'Samsung',
    name: 'Galaxy S24 Ultra 256GB',
    description: 'Smartphone premium com câmera de 200MP, S Pen integrada, tela Dynamic AMOLED 2X de 6,8" e processador Snapdragon 8 Gen 3.',
    price: 6299.99,
    originalPrice: 7499.99,
    stock: 8,
    categorias: ['Smartphones', 'Android'],
  })

  await criarProduto({
    brand: 'Samsung',
    name: 'Galaxy A55 128GB',
    description: 'Smartphone intermediário com tela Super AMOLED de 6,6", câmera tripla de 50MP e bateria de 5000mAh.',
    price: 1799.99,
    originalPrice: 2199.99,
    stock: 15,
    categorias: ['Smartphones', 'Android'],
  })

  await criarProduto({
    brand: 'Motorola',
    name: 'Edge 50 Pro 256GB',
    description: 'Design fino com tela pOLED de 6,7", câmera de 50MP com OIS e carregamento turbo de 125W.',
    price: 2499.99,
    originalPrice: 2999.99,
    stock: 10,
    categorias: ['Smartphones', 'Android'],
  })

  await criarProduto({
    brand: 'Motorola',
    name: 'Moto G84 128GB',
    description: 'Tela pOLED de 6,5", câmera de 50MP, bateria de 5000mAh e carregamento de 33W.',
    price: 1099.99,
    stock: 20,
    categorias: ['Smartphones', 'Android'],
  })

  await criarProduto({
    brand: 'Apple',
    name: 'iPhone 15 Pro 256GB',
    description: 'Carcaça em titânio, chip A17 Pro, câmera de 48MP com zoom óptico 5x e botão de ação personalizável.',
    price: 8499.99,
    originalPrice: 9299.99,
    stock: 5,
    categorias: ['Smartphones', 'iPhone'],
  })

  await criarProduto({
    brand: 'Apple',
    name: 'iPhone 15 128GB',
    description: 'Chip A16 Bionic, câmera principal de 48MP, Dynamic Island e conector USB-C.',
    price: 5499.99,
    stock: 12,
    categorias: ['Smartphones', 'iPhone'],
  })

  await criarProduto({
    brand: 'Xiaomi',
    name: 'Redmi 13C 128GB',
    description: 'Smartphone básico com tela de 6,74", câmera de 50MP e bateria de 5000mAh. Ótimo custo-benefício.',
    price: 699.99,
    originalPrice: 899.99,
    stock: 30,
    categorias: ['Smartphones', 'Básicos'],
  })

  console.log('\n🛡️ Capinhas & Acessórios para Celular\n')

  await criarProduto({
    brand: 'Spigen',
    name: 'Capa Ultra Hybrid iPhone 15 Pro',
    description: 'Capa transparente com bordas reforçadas em TPU e painel traseiro rígido. Proteção contra quedas com visual clean.',
    price: 159.99,
    originalPrice: 199.99,
    stock: 50,
    categorias: ['Acessórios para Celular', 'Capinhas'],
  })

  await criarProduto({
    brand: 'Capinha Store',
    name: 'Capa MagSafe Galaxy S24 Ultra',
    description: 'Capa slim compatível com MagSafe, material em policarbonato fosco, bordas em silicone.',
    price: 79.99,
    stock: 40,
    categorias: ['Acessórios para Celular', 'Capinhas'],
  })

  await criarProduto({
    brand: 'Baseus',
    name: 'Película de Vidro 3D iPhone 15',
    description: 'Vidro temperado 9H com cobertura total da tela, bordas curvas e instalação sem bolhas.',
    price: 49.99,
    originalPrice: 69.99,
    stock: 100,
    categorias: ['Acessórios para Celular', 'Películas'],
  })

  await criarProduto({
    brand: 'Baseus',
    name: 'Suporte Veicular Magnético',
    description: 'Suporte de celular para carro com fixação magnética potente, compatível com MagSafe e todas as marcas.',
    price: 89.99,
    stock: 35,
    categorias: ['Acessórios para Celular', 'Suportes & Apoios'],
  })

  await criarProduto({
    brand: 'PopSockets',
    name: 'Pop Socket Original Translúcido',
    description: 'Suporte e apoio para selfies com base adesiva reutilizável. Design translúcido minimalista.',
    price: 49.99,
    stock: 80,
    categorias: ['Acessórios para Celular', 'Pop Socket'],
  })

  console.log('\n🔌 Carregadores & Cabos\n')

  await criarProduto({
    brand: 'Anker',
    name: 'Carregador 65W GaN USB-C',
    description: 'Carregador compacto GaN de 65W com uma porta USB-C e uma USB-A. Compatível com notebooks, tablets e celulares.',
    price: 189.99,
    originalPrice: 249.99,
    stock: 25,
    categorias: ['Carregadores & Cabos', 'Carregamento Turbo'],
  })

  await criarProduto({
    brand: 'Samsung',
    name: 'Carregador 45W Super Fast Charging',
    description: 'Carregador original Samsung de 45W para Galaxy S e Note. Inclui cabo USB-C.',
    price: 149.99,
    stock: 20,
    categorias: ['Carregadores & Cabos', 'Carregamento Turbo'],
  })

  await criarProduto({
    brand: 'Apple',
    name: 'MagSafe Charger 15W',
    description: 'Carregador sem fio magnético oficial Apple de 15W para iPhone 12 ou mais recente.',
    price: 299.99,
    stock: 15,
    categorias: ['Carregadores & Cabos', 'Carregamento sem fio'],
  })

  await criarProduto({
    brand: 'Baseus',
    name: 'Carregador Veicular 30W USB-C + USB-A',
    description: 'Carregador para carro com duas portas (USB-C 30W e USB-A 18W), design compacto e LED indicador.',
    price: 69.99,
    originalPrice: 99.99,
    stock: 45,
    categorias: ['Carregadores & Cabos', 'Veicular'],
  })

  await criarProduto({
    brand: 'Anker',
    name: 'Cabo USB-C para USB-C 100W 2m',
    description: 'Cabo reforçado em nylon trançado, suporta carregamento de 100W e transferência de dados USB 3.1.',
    price: 79.99,
    stock: 60,
    categorias: ['Carregadores & Cabos', 'Cabos USB'],
  })

  await criarProduto({
    brand: 'Baseus',
    name: 'Power Bank 20000mAh 65W',
    description: 'Bateria portátil de alta capacidade com saída de 65W, suporta carregamento de notebook e dois dispositivos ao mesmo tempo.',
    price: 299.99,
    originalPrice: 399.99,
    stock: 18,
    categorias: ['Carregadores & Cabos', 'Power Bank'],
  })

  console.log('\n🎧 Áudio\n')

  await criarProduto({
    brand: 'Apple',
    name: 'AirPods Pro 2ª Geração',
    description: 'Cancelamento de ruído ativo adaptativo, Áudio Espacial personalizado, resistência à água IPX4 e estojo com carga USB-C.',
    price: 1799.99,
    originalPrice: 2099.99,
    stock: 10,
    categorias: ['Áudio', 'Fones sem fio (TWS)'],
  })

  await criarProduto({
    brand: 'Samsung',
    name: 'Galaxy Buds3 Pro',
    description: 'TWS premium com cancelamento de ruído inteligente, som Hi-Fi e design ergonômico com hastes.',
    price: 1099.99,
    originalPrice: 1299.99,
    stock: 12,
    categorias: ['Áudio', 'Fones sem fio (TWS)'],
  })

  await criarProduto({
    brand: 'JBL',
    name: 'Tune 720BT',
    description: 'Headphone over-ear sem fio com até 76h de bateria, dobrável e som JBL Pure Bass.',
    price: 349.99,
    originalPrice: 449.99,
    stock: 20,
    categorias: ['Áudio', 'Headphones'],
  })

  await criarProduto({
    brand: 'Sony',
    name: 'WH-1000XM5',
    description: 'Headphone premium com melhor cancelamento de ruído da categoria, 30h de bateria e microfone com IA.',
    price: 1999.99,
    originalPrice: 2499.99,
    stock: 6,
    categorias: ['Áudio', 'Headphones'],
  })

  await criarProduto({
    brand: 'JBL',
    name: 'Caixa Flip 6',
    description: 'Caixa portátil à prova d\'água IP67, som estéreo com baixo potente, 12h de bateria e conexão PartyBoost.',
    price: 699.99,
    originalPrice: 849.99,
    stock: 22,
    categorias: ['Áudio', 'Caixas de som Bluetooth'],
  })

  await criarProduto({
    brand: 'Marshall',
    name: 'Caixa Emberton III',
    description: 'Design icônico retrô, IP67, 32h de bateria e som 360° com assinatura Marshall.',
    price: 1099.99,
    stock: 8,
    categorias: ['Áudio', 'Caixas de som Bluetooth'],
  })

  console.log('\n💻 Notebooks\n')

  await criarProduto({
    brand: 'Dell',
    name: 'Alienware m16 R2',
    description: 'Notebook gamer com Intel Core i9-14900HX, RTX 4080 16GB, 32GB RAM, SSD 1TB e tela QHD+ 240Hz.',
    price: 18999.99,
    originalPrice: 21999.99,
    stock: 3,
    categorias: ['Notebooks', 'Gamer'],
  })

  await criarProduto({
    brand: 'Lenovo',
    name: 'LOQ 15 Intel Arc A530M',
    description: 'Gamer de entrada com Core i5-12450HX, 16GB RAM, SSD 512GB e tela FHD 144Hz.',
    price: 3999.99,
    originalPrice: 4799.99,
    stock: 7,
    categorias: ['Notebooks', 'Gamer'],
  })

  await criarProduto({
    brand: 'Apple',
    name: 'MacBook Air M3 13"',
    description: 'Chip M3, 8GB RAM, SSD 256GB, tela Liquid Retina, até 18h de bateria. O ultrafino mais avançado.',
    price: 10499.99,
    originalPrice: 11499.99,
    stock: 9,
    categorias: ['Notebooks', 'Ultrafino'],
  })

  await criarProduto({
    brand: 'Dell',
    name: 'XPS 13 Plus',
    description: 'Ultra-slim com Intel Core Ultra 7, 16GB RAM, SSD 512GB e tela OLED 3,5K de 13,4".',
    price: 9999.99,
    stock: 4,
    categorias: ['Notebooks', 'Ultrafino'],
  })

  await criarProduto({
    brand: 'Acer',
    name: 'Aspire 5 Core i5 8GB 512GB',
    description: 'Notebook custo-benefício para trabalho e estudos, com tela Full HD de 15,6" e SSD rápido.',
    price: 2499.99,
    originalPrice: 2999.99,
    stock: 14,
    categorias: ['Notebooks', 'Custo-benefício'],
  })

  console.log('\n🖱️ Acessórios para Notebook\n')

  await criarProduto({
    brand: 'Logitech',
    name: 'MX Master 3S',
    description: 'Mouse sem fio premium com sensor de 8000 DPI, scroll MagSpeed silencioso e até 70 dias de bateria.',
    price: 599.99,
    originalPrice: 749.99,
    stock: 18,
    categorias: ['Acessórios para Notebook', 'Mouses'],
  })

  await criarProduto({
    brand: 'Logitech',
    name: 'Teclado MX Keys S',
    description: 'Teclado sem fio inteligente com retroiluminação adaptativa, perfil de tecla esférica e bateria de 10 dias.',
    price: 699.99,
    originalPrice: 849.99,
    stock: 15,
    categorias: ['Acessórios para Notebook', 'Teclados'],
  })

  await criarProduto({
    brand: 'Targus',
    name: 'Mochila CityLite Pro 15.6"',
    description: 'Mochila executiva com compartimento acolchoado para notebook, porta USB externa e material resistente à água.',
    price: 349.99,
    stock: 25,
    categorias: ['Acessórios para Notebook', 'Mochilas & Cases'],
  })

  await criarProduto({
    brand: 'Baseus',
    name: 'Hub USB-C 9 em 1',
    description: 'Dock com HDMI 4K, 3x USB-A 3.0, USB-C 100W PD, leitor SD/MicroSD e porta Ethernet Gigabit.',
    price: 199.99,
    originalPrice: 279.99,
    stock: 30,
    categorias: ['Acessórios para Notebook', 'Hubs & Adaptadores'],
  })

  console.log('\n📱 Tablets\n')

  await criarProduto({
    brand: 'Samsung',
    name: 'Galaxy Tab S9 FE 128GB',
    description: 'Tablet Android com tela TFT de 10,9", S Pen incluída, câmera de 8MP e bateria de 8000mAh.',
    price: 1999.99,
    originalPrice: 2499.99,
    stock: 10,
    categorias: ['Tablets', 'Android'],
  })

  await criarProduto({
    brand: 'Apple',
    name: 'iPad Air M2 11" 128GB',
    description: 'Chip M2, tela Liquid Retina de 11", compatível com Apple Pencil Pro e Magic Keyboard.',
    price: 5499.99,
    stock: 7,
    categorias: ['Tablets', 'iPad'],
  })

  console.log('\n⌚ Smartwatch & Pulseiras\n')

  await criarProduto({
    brand: 'Apple',
    name: 'Apple Watch Series 10 45mm',
    description: 'O Apple Watch mais fino, tela sempre ativa maior, detecção de apneia do sono e carregamento rápido.',
    price: 3999.99,
    originalPrice: 4499.99,
    stock: 8,
    categorias: ['Smartwatch & Pulseiras', 'Apple Watch'],
  })

  await criarProduto({
    brand: 'Samsung',
    name: 'Galaxy Watch 7 44mm',
    description: 'Smartwatch Android com monitoramento avançado de saúde, BioActive Sensor e até 40h de bateria.',
    price: 1799.99,
    originalPrice: 2199.99,
    stock: 10,
    categorias: ['Smartwatch & Pulseiras', 'Android Wear'],
  })

  await criarProduto({
    brand: 'Xiaomi',
    name: 'Smart Band 9',
    description: 'Pulseira fitness ultraleve com tela AMOLED, 150+ modos esportivos, SpO2 e até 21 dias de bateria.',
    price: 249.99,
    originalPrice: 329.99,
    stock: 35,
    categorias: ['Smartwatch & Pulseiras', 'Pulseiras fitness'],
  })

  console.log('\n🎮 Games & Consoles\n')

  await criarProduto({
    brand: 'Sony',
    name: 'PlayStation 5 Slim',
    description: 'Console de última geração com SSD ultra-rápido, 4K a 120fps, ray tracing e leitor de disco.',
    price: 3799.99,
    originalPrice: 4299.99,
    stock: 5,
    categorias: ['Games & Consoles', 'Consoles'],
  })

  await criarProduto({
    brand: 'Microsoft',
    name: 'Xbox Series X',
    description: 'Console 4K 60fps com retrocompatibilidade, Game Pass e Quick Resume para múltiplos jogos.',
    price: 3499.99,
    stock: 6,
    categorias: ['Games & Consoles', 'Consoles'],
  })

  await criarProduto({
    brand: 'Sony',
    name: 'Controle DualSense PS5',
    description: 'Controle com feedback háptico, gatilhos adaptáveis e microfone integrado. Compatível com PS5 e PC.',
    price: 449.99,
    originalPrice: 549.99,
    stock: 20,
    categorias: ['Games & Consoles', 'Controles'],
  })

  await criarProduto({
    brand: 'HyperX',
    name: 'Cloud Alpha Wireless',
    description: 'Headset gamer sem fio com até 300h de bateria, cancelamento de ruído e som surround virtual.',
    price: 899.99,
    originalPrice: 1099.99,
    stock: 12,
    categorias: ['Games & Consoles', 'Headset Gamer'],
  })

  await criarProduto({
    brand: 'Corsair',
    name: 'Cadeira TC200 Leatherette',
    description: 'Cadeira gamer com apoio lombar ajustável, braços 4D, inclinação de até 165° e revestimento em couro sintético.',
    price: 1499.99,
    originalPrice: 1799.99,
    stock: 4,
    categorias: ['Games & Consoles', 'Cadeiras Gamer'],
  })

  console.log('\n📡 Redes & Conectividade\n')

  await criarProduto({
    brand: 'TP-Link',
    name: 'Roteador Archer AX3000 Wi-Fi 6',
    description: 'Roteador dual band AX3000 com Wi-Fi 6, 4 antenas e cobertura para casas de até 250m².',
    price: 349.99,
    originalPrice: 449.99,
    stock: 15,
    categorias: ['Redes & Conectividade', 'Roteadores'],
  })

  await criarProduto({
    brand: 'TP-Link',
    name: 'Repetidor Wi-Fi RE330 AC1200',
    description: 'Expande a rede Wi-Fi em até 90m², dual band AC1200 e porta LAN para conexão cabeada.',
    price: 149.99,
    originalPrice: 199.99,
    stock: 22,
    categorias: ['Redes & Conectividade', 'Repetidores Wi-Fi'],
  })

  console.log('\n📺 TV & Vídeo\n')

  await criarProduto({
    brand: 'Samsung',
    name: 'Smart TV QLED 55" 4K Q60D',
    description: 'Painel QLED com Quantum Processor 4K Lite, sistema Tizen, Alexa integrada e HDMI 2.1.',
    price: 3199.99,
    originalPrice: 3999.99,
    stock: 6,
    categorias: ['TV & Vídeo', 'Smart TV'],
  })

  await criarProduto({
    brand: 'Google',
    name: 'Chromecast com Google TV 4K',
    description: 'Transforma qualquer TV em Smart TV com Google TV, suporte a 4K HDR e controle de voz.',
    price: 299.99,
    originalPrice: 399.99,
    stock: 18,
    categorias: ['TV & Vídeo', 'Streaming (Chromecast, Fire TV)'],
  })

  await criarProduto({
    brand: 'Amazon',
    name: 'Fire TV Stick 4K Max',
    description: 'Streaming 4K com Wi-Fi 6E, Alexa e acesso a Prime Video, Netflix, Disney+ e mais.',
    price: 399.99,
    stock: 20,
    categorias: ['TV & Vídeo', 'Streaming (Chromecast, Fire TV)'],
  })

  console.log('\n📷 Foto & Vídeo\n')

  await criarProduto({
    brand: 'DJI',
    name: 'Drone Mini 4 Pro',
    description: 'Drone dobrável com câmera 4K/60fps, autonomia de 34 min, obstáculos em todas as direções e transmissão a 20km.',
    price: 5999.99,
    originalPrice: 6999.99,
    stock: 4,
    categorias: ['Foto & Vídeo', 'Drones'],
  })

  await criarProduto({
    brand: 'GoPro',
    name: 'HERO13 Black',
    description: 'Câmera de ação à prova d\'água, vídeo 5.3K, foto de 27MP, HyperSmooth 6.0 e tela frontal.',
    price: 2499.99,
    originalPrice: 2999.99,
    stock: 8,
    categorias: ['Foto & Vídeo', 'Câmeras'],
  })

  await criarProduto({
    brand: 'Joby',
    name: 'GorillaPod 3K Kit',
    description: 'Tripé flexível e dobrável suporta até 3kg, compatível com câmeras mirrorless, ação e smartphones.',
    price: 299.99,
    originalPrice: 389.99,
    stock: 16,
    categorias: ['Foto & Vídeo', 'Tripés & Acessórios'],
  })

  console.log('\n✅ Todos os produtos foram inseridos com sucesso!\n')
}

main()
  .catch((error) => {
    console.error('Erro ao inserir produtos:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
