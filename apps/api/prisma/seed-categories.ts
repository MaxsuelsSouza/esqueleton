// Script de seed — insere as categorias de eletrônicos no banco de dados
// Execute com: npx ts-node prisma/seed-categories.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Definição das categorias pai e seus filhos
const CATEGORIAS = [
  {
    name: 'Smartphones',
    filhos: ['Android', 'iPhone', 'Básicos'],
  },
  {
    name: 'Acessórios para Celular',
    filhos: ['Capinhas', 'Películas', 'Suportes & Apoios', 'Pop Socket'],
  },
  {
    name: 'Carregadores & Cabos',
    filhos: ['Carregamento Turbo', 'Carregamento sem fio', 'Veicular', 'Cabos USB', 'Power Bank'],
  },
  {
    name: 'Áudio',
    filhos: ['Fones sem fio (TWS)', 'Fones com fio', 'Headphones', 'Caixas de som Bluetooth'],
  },
  {
    name: 'Notebooks',
    filhos: ['Gamer', 'Ultrafino', 'Custo-benefício'],
  },
  {
    name: 'Acessórios para Notebook',
    filhos: ['Mouses', 'Teclados', 'Mochilas & Cases', 'Hubs & Adaptadores'],
  },
  {
    name: 'Tablets',
    filhos: ['Android', 'iPad'],
  },
  {
    name: 'Smartwatch & Pulseiras',
    filhos: ['Android Wear', 'Apple Watch', 'Pulseiras fitness'],
  },
  {
    name: 'Games & Consoles',
    filhos: ['Consoles', 'Controles', 'Headset Gamer', 'Cadeiras Gamer'],
  },
  {
    name: 'Redes & Conectividade',
    filhos: ['Roteadores', 'Repetidores Wi-Fi', 'Switches'],
  },
  {
    name: 'TV & Vídeo',
    filhos: ['Smart TV', 'Streaming (Chromecast, Fire TV)', 'Projetores'],
  },
  {
    name: 'Foto & Vídeo',
    filhos: ['Câmeras', 'Drones', 'Tripés & Acessórios'],
  },
]

async function main() {
  console.log('Inserindo categorias de eletrônicos...\n')

  for (const categoria of CATEGORIAS) {
    // Cria a categoria pai
    const pai = await prisma.category.create({
      data: { name: categoria.name },
    })
    console.log(`✔ ${categoria.name} (id: ${pai.id})`)

    // Cria cada subcategoria apontando para o pai
    for (const nomeFilho of categoria.filhos) {
      const filho = await prisma.category.create({
        data: { name: nomeFilho, parentId: pai.id },
      })
      console.log(`    └─ ${filho.name} (id: ${filho.id})`)
    }
  }

  console.log('\nConcluído!')
}

main()
  .catch((error) => {
    console.error('Erro ao inserir categorias:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
