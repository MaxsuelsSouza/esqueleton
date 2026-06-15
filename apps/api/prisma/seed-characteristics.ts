// Script que adiciona características a todos os produtos cadastrados
// Execute com: cd apps/api && npx tsx prisma/seed-characteristics.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type Characteristic = { name: string; value: string }

// Mapeamento: nome do produto → características técnicas
const CHARACTERISTICS: Record<string, Characteristic[]> = {
  // ── Smartphones ────────────────────────────────────────────────
  'Galaxy S24 Ultra 256GB': [
    { name: 'Tela', value: 'Dynamic AMOLED 2X, 6,8"' },
    { name: 'Processador', value: 'Snapdragon 8 Gen 3' },
    { name: 'Câmera', value: '200MP + 50MP + 12MP + 10MP' },
    { name: 'Memória RAM', value: '12GB' },
    { name: 'Armazenamento', value: '256GB' },
    { name: 'Bateria', value: '5000mAh' },
    { name: 'Sistema', value: 'Android 14 (One UI 6.1)' },
    { name: 'Resistência', value: 'IP68' },
  ],
  'Galaxy A55 128GB': [
    { name: 'Tela', value: 'Super AMOLED, 6,6"' },
    { name: 'Processador', value: 'Exynos 1480' },
    { name: 'Câmera', value: '50MP + 12MP + 5MP' },
    { name: 'Memória RAM', value: '8GB' },
    { name: 'Armazenamento', value: '128GB' },
    { name: 'Bateria', value: '5000mAh' },
    { name: 'Sistema', value: 'Android 14 (One UI 6.1)' },
    { name: 'Resistência', value: 'IP67' },
  ],
  'Edge 50 Pro 256GB': [
    { name: 'Tela', value: 'pOLED, 6,7", 144Hz' },
    { name: 'Processador', value: 'Snapdragon 7 Gen 3' },
    { name: 'Câmera', value: '50MP OIS + 13MP + 10MP' },
    { name: 'Memória RAM', value: '12GB' },
    { name: 'Armazenamento', value: '256GB' },
    { name: 'Bateria', value: '4500mAh' },
    { name: 'Carregamento', value: '125W TurboPower' },
    { name: 'Sistema', value: 'Android 14' },
  ],
  'Moto G84 128GB': [
    { name: 'Tela', value: 'pOLED, 6,5", 120Hz' },
    { name: 'Processador', value: 'Snapdragon 695' },
    { name: 'Câmera', value: '50MP + 8MP' },
    { name: 'Memória RAM', value: '8GB' },
    { name: 'Armazenamento', value: '128GB' },
    { name: 'Bateria', value: '5000mAh' },
    { name: 'Carregamento', value: '33W' },
    { name: 'Sistema', value: 'Android 13' },
  ],
  'iPhone 15 Pro 256GB': [
    { name: 'Tela', value: 'Super Retina XDR OLED, 6,1"' },
    { name: 'Processador', value: 'Apple A17 Pro' },
    { name: 'Câmera', value: '48MP + 12MP + 12MP (zoom 5x)' },
    { name: 'Memória RAM', value: '8GB' },
    { name: 'Armazenamento', value: '256GB' },
    { name: 'Material', value: 'Titânio' },
    { name: 'Sistema', value: 'iOS 17' },
    { name: 'Resistência', value: 'IP68' },
  ],
  'iPhone 15 128GB': [
    { name: 'Tela', value: 'Super Retina XDR OLED, 6,1"' },
    { name: 'Processador', value: 'Apple A16 Bionic' },
    { name: 'Câmera', value: '48MP + 12MP' },
    { name: 'Memória RAM', value: '6GB' },
    { name: 'Armazenamento', value: '128GB' },
    { name: 'Conector', value: 'USB-C' },
    { name: 'Sistema', value: 'iOS 17' },
    { name: 'Resistência', value: 'IP68' },
  ],
  'Redmi 13C 128GB': [
    { name: 'Tela', value: 'IPS LCD, 6,74"' },
    { name: 'Processador', value: 'MediaTek Helio G85' },
    { name: 'Câmera', value: '50MP + 2MP + 0,08MP' },
    { name: 'Memória RAM', value: '4GB' },
    { name: 'Armazenamento', value: '128GB' },
    { name: 'Bateria', value: '5000mAh' },
    { name: 'Sistema', value: 'Android 13 (MIUI 14)' },
  ],

  // ── Acessórios para Celular ────────────────────────────────────
  'Capa Ultra Hybrid iPhone 15 Pro': [
    { name: 'Material', value: 'TPU + Policarbonato' },
    { name: 'Compatibilidade', value: 'iPhone 15 Pro' },
    { name: 'Cor', value: 'Transparente' },
    { name: 'Proteção', value: 'Bordas reforçadas contra quedas' },
  ],
  'Capa MagSafe Galaxy S24 Ultra': [
    { name: 'Material', value: 'Policarbonato fosco + Silicone' },
    { name: 'Compatibilidade', value: 'Galaxy S24 Ultra' },
    { name: 'MagSafe', value: 'Compatível' },
    { name: 'Tipo', value: 'Slim' },
  ],
  'Película de Vidro 3D iPhone 15': [
    { name: 'Material', value: 'Vidro temperado 9H' },
    { name: 'Compatibilidade', value: 'iPhone 15' },
    { name: 'Cobertura', value: 'Total com bordas curvas' },
    { name: 'Instalação', value: 'Sem bolhas' },
  ],
  'Suporte Veicular Magnético': [
    { name: 'Tipo', value: 'Magnético' },
    { name: 'Compatibilidade', value: 'MagSafe e todas as marcas' },
    { name: 'Fixação', value: 'Saída de ar do carro' },
    { name: 'Rotação', value: '360°' },
  ],
  'Pop Socket Original Translúcido': [
    { name: 'Material', value: 'Policarbonato translúcido' },
    { name: 'Base', value: 'Adesiva reutilizável' },
    { name: 'Compatibilidade', value: 'Universal' },
    { name: 'Função', value: 'Suporte e apoio para selfies' },
  ],

  // ── Carregadores & Cabos ───────────────────────────────────────
  'Carregador 65W GaN USB-C': [
    { name: 'Potência', value: '65W' },
    { name: 'Tecnologia', value: 'GaN (Nitreto de Gálio)' },
    { name: 'Portas', value: '1x USB-C + 1x USB-A' },
    { name: 'Compatibilidade', value: 'Notebooks, tablets e celulares' },
    { name: 'Voltagem', value: 'Bivolt (100-240V)' },
  ],
  'Carregador 45W Super Fast Charging': [
    { name: 'Potência', value: '45W' },
    { name: 'Protocolo', value: 'Super Fast Charging 2.0' },
    { name: 'Porta', value: 'USB-C' },
    { name: 'Cabo incluso', value: 'Sim (USB-C)' },
    { name: 'Compatibilidade', value: 'Galaxy S e Note' },
  ],
  'MagSafe Charger 15W': [
    { name: 'Potência', value: '15W' },
    { name: 'Tipo', value: 'Sem fio magnético' },
    { name: 'Compatibilidade', value: 'iPhone 12 ou superior' },
    { name: 'Conexão', value: 'USB-C' },
  ],
  'Carregador Veicular 30W USB-C + USB-A': [
    { name: 'Potência total', value: '48W (30W + 18W)' },
    { name: 'Portas', value: 'USB-C 30W + USB-A 18W' },
    { name: 'Indicador', value: 'LED azul' },
    { name: 'Peso', value: '28g' },
  ],
  'Cabo USB-C para USB-C 100W 2m': [
    { name: 'Potência', value: '100W' },
    { name: 'Comprimento', value: '2 metros' },
    { name: 'Material', value: 'Nylon trançado' },
    { name: 'Transferência', value: 'USB 3.1 (10Gbps)' },
    { name: 'Conector', value: 'USB-C para USB-C' },
  ],
  'Power Bank 20000mAh 65W': [
    { name: 'Capacidade', value: '20.000mAh' },
    { name: 'Potência máxima', value: '65W' },
    { name: 'Saídas', value: '2x USB-C + 1x USB-A' },
    { name: 'Compatibilidade', value: 'Notebooks, tablets e celulares' },
    { name: 'Display', value: 'Digital (nível de carga)' },
  ],

  // ── Áudio ──────────────────────────────────────────────────────
  'AirPods Pro 2ª Geração': [
    { name: 'Tipo', value: 'TWS (in-ear)' },
    { name: 'Cancelamento de ruído', value: 'Ativo adaptativo' },
    { name: 'Áudio Espacial', value: 'Personalizado' },
    { name: 'Resistência', value: 'IPX4' },
    { name: 'Bateria (fones)', value: '6h' },
    { name: 'Bateria (estojo)', value: '30h total' },
    { name: 'Carregamento', value: 'USB-C / MagSafe / Qi' },
  ],
  'Galaxy Buds3 Pro': [
    { name: 'Tipo', value: 'TWS (in-ear com hastes)' },
    { name: 'Cancelamento de ruído', value: 'Inteligente' },
    { name: 'Qualidade de áudio', value: 'Hi-Fi 24bit' },
    { name: 'Resistência', value: 'IP57' },
    { name: 'Bateria (fones)', value: '7h' },
    { name: 'Bateria (estojo)', value: '30h total' },
    { name: 'Conectividade', value: 'Bluetooth 5.4' },
  ],
  'Tune 720BT': [
    { name: 'Tipo', value: 'Over-ear (supra-auricular)' },
    { name: 'Bateria', value: '76h' },
    { name: 'Driver', value: '40mm' },
    { name: 'Dobrável', value: 'Sim' },
    { name: 'Conectividade', value: 'Bluetooth 5.3' },
    { name: 'Peso', value: '198g' },
  ],
  'WH-1000XM5': [
    { name: 'Tipo', value: 'Over-ear (supra-auricular)' },
    { name: 'Cancelamento de ruído', value: 'Líder da categoria (8 microfones)' },
    { name: 'Bateria', value: '30h' },
    { name: 'Driver', value: '30mm carbono' },
    { name: 'Carregamento rápido', value: '3 min → 3h de uso' },
    { name: 'Conectividade', value: 'Bluetooth 5.2, LDAC, NFC' },
    { name: 'Peso', value: '250g' },
  ],
  'Caixa Flip 6': [
    { name: 'Potência', value: '30W RMS' },
    { name: 'Resistência', value: 'IP67 (água e poeira)' },
    { name: 'Bateria', value: '12h' },
    { name: 'Conectividade', value: 'Bluetooth 5.1 + PartyBoost' },
    { name: 'Peso', value: '550g' },
    { name: 'Dimensões', value: '17,8 × 6,8 × 7,2 cm' },
  ],
  'Caixa Emberton III': [
    { name: 'Potência', value: '30W' },
    { name: 'Resistência', value: 'IP67' },
    { name: 'Bateria', value: '32h' },
    { name: 'Som', value: '360° True Stereophonic' },
    { name: 'Conectividade', value: 'Bluetooth 5.3' },
    { name: 'Peso', value: '680g' },
  ],

  // ── Notebooks ──────────────────────────────────────────────────
  'Alienware m16 R2': [
    { name: 'Processador', value: 'Intel Core i9-14900HX' },
    { name: 'Placa de vídeo', value: 'NVIDIA RTX 4080 16GB' },
    { name: 'Memória RAM', value: '32GB DDR5' },
    { name: 'Armazenamento', value: 'SSD 1TB NVMe' },
    { name: 'Tela', value: '16" QHD+ 240Hz' },
    { name: 'Sistema', value: 'Windows 11' },
    { name: 'Peso', value: '2,8kg' },
  ],
  'LOQ 15 Intel Arc A530M': [
    { name: 'Processador', value: 'Intel Core i5-12450HX' },
    { name: 'Placa de vídeo', value: 'Intel Arc A530M' },
    { name: 'Memória RAM', value: '16GB DDR5' },
    { name: 'Armazenamento', value: 'SSD 512GB NVMe' },
    { name: 'Tela', value: '15,6" FHD 144Hz' },
    { name: 'Sistema', value: 'Windows 11' },
    { name: 'Peso', value: '2,4kg' },
  ],
  'MacBook Air M3 13"': [
    { name: 'Processador', value: 'Apple M3 (8 núcleos)' },
    { name: 'Memória RAM', value: '8GB unificada' },
    { name: 'Armazenamento', value: 'SSD 256GB' },
    { name: 'Tela', value: '13,6" Liquid Retina' },
    { name: 'Bateria', value: 'Até 18h' },
    { name: 'Sistema', value: 'macOS Sonoma' },
    { name: 'Peso', value: '1,24kg' },
  ],
  'XPS 13 Plus': [
    { name: 'Processador', value: 'Intel Core Ultra 7' },
    { name: 'Memória RAM', value: '16GB LPDDR5x' },
    { name: 'Armazenamento', value: 'SSD 512GB' },
    { name: 'Tela', value: '13,4" OLED 3,5K' },
    { name: 'Sistema', value: 'Windows 11' },
    { name: 'Peso', value: '1,23kg' },
  ],
  'Aspire 5 Core i5 8GB 512GB': [
    { name: 'Processador', value: 'Intel Core i5-1335U' },
    { name: 'Memória RAM', value: '8GB DDR4' },
    { name: 'Armazenamento', value: 'SSD 512GB' },
    { name: 'Tela', value: '15,6" Full HD IPS' },
    { name: 'Sistema', value: 'Windows 11' },
    { name: 'Peso', value: '1,76kg' },
  ],

  // ── Acessórios para Notebook ───────────────────────────────────
  'MX Master 3S': [
    { name: 'Sensor', value: '8000 DPI' },
    { name: 'Bateria', value: 'Até 70 dias' },
    { name: 'Scroll', value: 'MagSpeed (silencioso)' },
    { name: 'Conexão', value: 'Bluetooth + Logi Bolt USB' },
    { name: 'Compatibilidade', value: 'Windows, macOS, Linux' },
    { name: 'Carregamento', value: 'USB-C' },
  ],
  'Teclado MX Keys S': [
    { name: 'Tipo', value: 'Membrana de perfil baixo' },
    { name: 'Retroiluminação', value: 'Adaptativa (sensor de proximidade)' },
    { name: 'Bateria', value: '10 dias (com luz) / 5 meses (sem)' },
    { name: 'Conexão', value: 'Bluetooth + Logi Bolt USB' },
    { name: 'Layout', value: 'ABNT2' },
    { name: 'Compatibilidade', value: 'Windows, macOS, Linux' },
  ],
  'Mochila CityLite Pro 15.6"': [
    { name: 'Compatibilidade', value: 'Notebooks até 15,6"' },
    { name: 'Material', value: 'Poliéster resistente à água' },
    { name: 'Compartimento', value: 'Acolchoado para notebook' },
    { name: 'Porta USB', value: 'Externa (passthrough)' },
    { name: 'Tipo', value: 'Executiva' },
  ],
  'Hub USB-C 9 em 1': [
    { name: 'Portas', value: 'HDMI 4K + 3x USB-A 3.0 + USB-C PD' },
    { name: 'Extras', value: 'Leitor SD/MicroSD + Ethernet Gigabit' },
    { name: 'USB-C PD', value: '100W (passthrough)' },
    { name: 'HDMI', value: '4K a 30Hz' },
    { name: 'Compatibilidade', value: 'USB-C com DP Alt Mode' },
  ],

  // ── Tablets ────────────────────────────────────────────────────
  'Galaxy Tab S9 FE 128GB': [
    { name: 'Tela', value: 'TFT 10,9", 90Hz' },
    { name: 'Processador', value: 'Exynos 1380' },
    { name: 'Memória RAM', value: '6GB' },
    { name: 'Armazenamento', value: '128GB (expansível)' },
    { name: 'Bateria', value: '8000mAh' },
    { name: 'S Pen', value: 'Incluída' },
    { name: 'Resistência', value: 'IP68' },
    { name: 'Sistema', value: 'Android 13 (One UI 5.1)' },
  ],
  'iPad Air M2 11" 128GB': [
    { name: 'Tela', value: 'Liquid Retina 11"' },
    { name: 'Processador', value: 'Apple M2' },
    { name: 'Armazenamento', value: '128GB' },
    { name: 'Acessórios', value: 'Apple Pencil Pro + Magic Keyboard' },
    { name: 'Câmera', value: '12MP (traseira) + 12MP (frontal)' },
    { name: 'Conector', value: 'USB-C' },
    { name: 'Sistema', value: 'iPadOS 17' },
  ],

  // ── Smartwatch & Pulseiras ─────────────────────────────────────
  'Apple Watch Series 10 45mm': [
    { name: 'Tela', value: 'OLED LTPO sempre ativa, 45mm' },
    { name: 'Processador', value: 'Apple S10' },
    { name: 'Sensores', value: 'Frequência cardíaca, SpO2, temperatura' },
    { name: 'Detecção', value: 'Apneia do sono, quedas, batidas' },
    { name: 'Resistência', value: 'WR50 (natação)' },
    { name: 'Sistema', value: 'watchOS 11' },
    { name: 'Bateria', value: 'Até 18h' },
  ],
  'Galaxy Watch 7 44mm': [
    { name: 'Tela', value: 'Super AMOLED, 44mm' },
    { name: 'Processador', value: 'Exynos W1000' },
    { name: 'Sensor', value: 'BioActive (saúde avançada)' },
    { name: 'Bateria', value: 'Até 40h' },
    { name: 'Resistência', value: 'IP68 + 5ATM + MIL-STD-810H' },
    { name: 'Sistema', value: 'Wear OS 5 (One UI Watch 6)' },
    { name: 'Conectividade', value: 'Bluetooth 5.3, Wi-Fi, NFC, GPS' },
  ],
  'Smart Band 9': [
    { name: 'Tela', value: 'AMOLED 1,62"' },
    { name: 'Bateria', value: 'Até 21 dias' },
    { name: 'Modos esportivos', value: '150+' },
    { name: 'Sensores', value: 'Frequência cardíaca, SpO2' },
    { name: 'Resistência', value: '5ATM' },
    { name: 'Peso', value: '15,8g (sem pulseira)' },
    { name: 'Conectividade', value: 'Bluetooth 5.4' },
  ],

  // ── Games & Consoles ───────────────────────────────────────────
  'PlayStation 5 Slim': [
    { name: 'Processador', value: 'AMD Zen 2, 8 núcleos' },
    { name: 'GPU', value: 'AMD RDNA 2, 10,28 TFLOPS' },
    { name: 'Memória', value: '16GB GDDR6' },
    { name: 'Armazenamento', value: 'SSD 1TB NVMe' },
    { name: 'Resolução', value: '4K a 120fps' },
    { name: 'Ray tracing', value: 'Sim (hardware)' },
    { name: 'Mídia', value: 'Blu-ray Ultra HD' },
  ],
  'Xbox Series X': [
    { name: 'Processador', value: 'AMD Zen 2, 8 núcleos 3,8GHz' },
    { name: 'GPU', value: 'AMD RDNA 2, 12 TFLOPS' },
    { name: 'Memória', value: '16GB GDDR6' },
    { name: 'Armazenamento', value: 'SSD 1TB NVMe' },
    { name: 'Resolução', value: '4K a 60fps (até 120fps)' },
    { name: 'Retrocompatibilidade', value: 'Xbox, 360 e One' },
    { name: 'Game Pass', value: 'Compatível' },
  ],
  'Controle DualSense PS5': [
    { name: 'Feedback háptico', value: 'Sim (avançado)' },
    { name: 'Gatilhos adaptáveis', value: 'Sim' },
    { name: 'Microfone', value: 'Integrado' },
    { name: 'Bateria', value: 'Até 12h' },
    { name: 'Conexão', value: 'Bluetooth 5.1 / USB-C' },
    { name: 'Compatibilidade', value: 'PS5 e PC' },
  ],
  'Cloud Alpha Wireless': [
    { name: 'Tipo', value: 'Over-ear (circum-auricular)' },
    { name: 'Bateria', value: 'Até 300h' },
    { name: 'Driver', value: '50mm Dual Chamber' },
    { name: 'Cancelamento de ruído', value: 'Passivo' },
    { name: 'Conexão', value: '2,4GHz sem fio' },
    { name: 'Compatibilidade', value: 'PC, PS5, PS4' },
    { name: 'Peso', value: '335g' },
  ],
  'Cadeira TC200 Leatherette': [
    { name: 'Material', value: 'Couro sintético (leatherette)' },
    { name: 'Apoio lombar', value: 'Ajustável' },
    { name: 'Braços', value: '4D (ajuste em 4 direções)' },
    { name: 'Inclinação', value: 'Até 165°' },
    { name: 'Peso suportado', value: 'Até 120kg' },
    { name: 'Altura do assento', value: 'Ajustável (pistão classe 4)' },
  ],

  // ── Redes & Conectividade ──────────────────────────────────────
  'Roteador Archer AX3000 Wi-Fi 6': [
    { name: 'Padrão', value: 'Wi-Fi 6 (802.11ax)' },
    { name: 'Velocidade', value: 'AX3000 (2402 + 574 Mbps)' },
    { name: 'Banda', value: 'Dual Band (2,4 + 5 GHz)' },
    { name: 'Antenas', value: '4 externas' },
    { name: 'Cobertura', value: 'Até 250m²' },
    { name: 'Portas', value: '1x WAN + 4x LAN Gigabit' },
  ],
  'Repetidor Wi-Fi RE330 AC1200': [
    { name: 'Padrão', value: 'Wi-Fi 5 (802.11ac)' },
    { name: 'Velocidade', value: 'AC1200 (867 + 300 Mbps)' },
    { name: 'Banda', value: 'Dual Band' },
    { name: 'Cobertura extra', value: 'Até 90m²' },
    { name: 'Porta LAN', value: '1x Fast Ethernet' },
    { name: 'Modo AP', value: 'Sim' },
  ],

  // ── TV & Vídeo ─────────────────────────────────────────────────
  'Smart TV QLED 55" 4K Q60D': [
    { name: 'Tela', value: 'QLED 55", 4K (3840×2160)' },
    { name: 'Processador', value: 'Quantum Processor 4K Lite' },
    { name: 'Sistema', value: 'Tizen' },
    { name: 'Assistente', value: 'Alexa integrada' },
    { name: 'HDMI', value: '3x (1x HDMI 2.1)' },
    { name: 'HDR', value: 'HDR10+ / HLG' },
    { name: 'Taxa de atualização', value: '60Hz (Motion Rate 120)' },
  ],
  'Chromecast com Google TV 4K': [
    { name: 'Resolução', value: '4K HDR (60fps)' },
    { name: 'Sistema', value: 'Google TV' },
    { name: 'Assistente', value: 'Google Assistente (controle de voz)' },
    { name: 'Conexão', value: 'Wi-Fi 5 (ac) + Bluetooth' },
    { name: 'Conector', value: 'HDMI + USB-C (alimentação)' },
    { name: 'HDR', value: 'HDR10, HDR10+, Dolby Vision' },
  ],
  'Fire TV Stick 4K Max': [
    { name: 'Resolução', value: '4K Ultra HD' },
    { name: 'Wi-Fi', value: 'Wi-Fi 6E (tri-band)' },
    { name: 'Assistente', value: 'Alexa (controle de voz)' },
    { name: 'Processador', value: 'Quad-core 2.0 GHz' },
    { name: 'Memória', value: '2GB RAM + 16GB armazenamento' },
    { name: 'HDR', value: 'HDR10+, HLG, Dolby Vision' },
    { name: 'Áudio', value: 'Dolby Atmos' },
  ],

  // ── Foto & Vídeo ───────────────────────────────────────────────
  'Drone Mini 4 Pro': [
    { name: 'Câmera', value: '4K/60fps, 48MP' },
    { name: 'Autonomia', value: '34 minutos' },
    { name: 'Alcance', value: '20km (transmissão O4)' },
    { name: 'Sensor de obstáculos', value: 'Omnidirecional' },
    { name: 'Peso', value: '249g (sem necessidade de registro)' },
    { name: 'Gimbal', value: '3 eixos' },
    { name: 'Dobrável', value: 'Sim' },
  ],
  'HERO13 Black': [
    { name: 'Vídeo', value: '5.3K / 60fps' },
    { name: 'Foto', value: '27MP' },
    { name: 'Estabilização', value: 'HyperSmooth 6.0' },
    { name: 'Resistência', value: 'À prova d\'água (10m)' },
    { name: 'Telas', value: 'Traseira touch + frontal' },
    { name: 'Bateria', value: 'Enduro (prolongada)' },
    { name: 'GPS', value: 'Integrado' },
  ],
  'GorillaPod 3K Kit': [
    { name: 'Carga máxima', value: '3kg' },
    { name: 'Tipo', value: 'Flexível e dobrável' },
    { name: 'Cabeça', value: 'Ball head com trava' },
    { name: 'Compatibilidade', value: 'Mirrorless, ação, smartphones' },
    { name: 'Material', value: 'ABS + aço inox' },
    { name: 'Peso', value: '305g' },
  ],
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true },
  })

  console.log(`\nEncontrados ${products.length} produtos no banco.\n`)

  let atualizados = 0
  let semCaracteristicas = 0

  for (const product of products) {
    const chars = CHARACTERISTICS[product.name]
    if (!chars) {
      console.log(`  ⚠ Sem características definidas: ${product.name}`)
      semCaracteristicas++
      continue
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { characteristics: chars },
    })
    console.log(`  ✔ ${product.name} (${chars.length} características)`)
    atualizados++
  }

  console.log(`\n✅ ${atualizados} produtos atualizados, ${semCaracteristicas} sem características definidas.\n`)
}

main()
  .catch((error) => {
    console.error('Erro:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
