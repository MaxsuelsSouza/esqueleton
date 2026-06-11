// Executa um comando com as variáveis de ambiente do perfil de banco escolhido.
//
// O perfil define qual arquivo .env é carregado:
//   sem perfil      → apps/api/.env          (banco padrão)
//   perfil "loja1"  → apps/api/.env.loja1    (banco do docker postgres-loja1)
//
// O perfil pode vir de dois lugares:
//   1. variável de ambiente PERFIL (é assim que o "pnpm dev --loja1" repassa)
//   2. último argumento no formato --nome (ex: pnpm db:migrate --loja1)
//
// Exemplos:
//   node scripts/com-perfil.mjs tsx watch src/main.ts
//   node scripts/com-perfil.mjs prisma migrate dev --loja1
import { spawn } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Pasta apps/api — os arquivos .env moram aqui, independente de onde o comando foi chamado
const pastaDaApi = join(dirname(fileURLToPath(import.meta.url)), '..')

let argumentos = process.argv.slice(2)
let perfil = process.env.PERFIL ?? ''

// Se o último argumento é --nome, ele é o perfil (e não vai para o comando)
const ultimo = argumentos[argumentos.length - 1] ?? ''
if (/^--[a-z0-9][a-z0-9-]*$/.test(ultimo)) {
  perfil = ultimo.slice(2)
  argumentos = argumentos.slice(0, -1)
}

if (argumentos.length === 0) {
  console.error('Informe o comando a executar. Ex: node scripts/com-perfil.mjs prisma migrate dev --loja1')
  process.exit(1)
}

// Escolhe o arquivo .env conforme o perfil
const nomeDoArquivo = perfil ? `.env.${perfil}` : '.env'
const caminhoDoEnv = join(pastaDaApi, nomeDoArquivo)

if (perfil && !existsSync(caminhoDoEnv)) {
  console.error(
    `Perfil "${perfil}" sem configuração: crie o arquivo apps/api/${nomeDoArquivo}\n` +
    `(copie o apps/api/.env.${perfil}.example se existir, ou o apps/api/.env.example e ajuste a porta do banco)`
  )
  process.exit(1)
}

// Carrega o arquivo .env linha a linha (KEY=valor), sem sobrescrever
// variáveis que já vieram do ambiente
if (existsSync(caminhoDoEnv)) {
  for (const linha of readFileSync(caminhoDoEnv, 'utf8').split(/\r?\n/)) {
    const semEspacos = linha.trim()
    if (!semEspacos || semEspacos.startsWith('#')) continue
    const separador = semEspacos.indexOf('=')
    if (separador === -1) continue
    const chave = semEspacos.slice(0, separador).trim()
    // Remove aspas ao redor do valor, se houver
    const valor = semEspacos.slice(separador + 1).trim().replace(/^["']|["']$/g, '')
    if (!(chave in process.env)) process.env[chave] = valor
  }
}

if (perfil) {
  console.log(`Usando o perfil de banco "${perfil}" (${nomeDoArquivo})`)
}

// Executa o comando pedido com o ambiente já preparado
const [comando, ...resto] = argumentos
const processo = spawn(comando, resto, { stdio: 'inherit', shell: true, env: process.env })
processo.on('exit', (codigo) => process.exit(codigo ?? 0))
