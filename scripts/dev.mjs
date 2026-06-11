// Inicia o ambiente de desenvolvimento, com suporte a perfis de banco de dados.
//
//   pnpm dev            → banco padrão (serviço "postgres" do docker-compose)
//   pnpm dev --loja1    → banco do perfil "loja1" (serviço "postgres-loja1")
//
// O perfil escolhido:
//   1. sobe o serviço do Docker correspondente (docker-compose --profile <perfil>)
//   2. é repassado para a API pela variável de ambiente PERFIL — a API então
//      carrega apps/api/.env.<perfil> em vez do apps/api/.env padrão
import { spawn, spawnSync } from 'node:child_process'

// O perfil vem do primeiro argumento no formato --nome (ex: --loja1)
const argumento = process.argv[2] ?? ''
const perfil = argumento.startsWith('--') ? argumento.slice(2) : ''

if (argumento && !perfil) {
  console.error(`Argumento não reconhecido: "${argumento}". Use o formato: pnpm dev --loja1`)
  process.exit(1)
}

// 1. Sobe o banco — com perfil, o docker compose sobe também o serviço daquele perfil
const argumentosDocker = perfil
  ? ['--profile', perfil, 'up', '-d']
  : ['up', '-d']

console.log(perfil ? `Subindo o banco do perfil "${perfil}"...` : 'Subindo o banco padrão...')

// Descobre como chamar o docker compose nesta máquina, nesta ordem:
//   1. "docker compose" (Docker atual)
//   2. "docker-compose" (instalações antigas)
//   3. "wsl docker compose" (Windows onde o Docker só roda dentro do WSL)
const formasDeChamar = [
  ['docker', 'compose'],
  ['docker-compose'],
  ['wsl', 'docker', 'compose'],
]
const formaDisponivel = formasDeChamar.find(([comando, ...prefixo]) => {
  const teste = spawnSync(comando, [...prefixo, 'version'], { stdio: 'ignore', shell: true })
  return teste.status === 0
})

if (!formaDisponivel) {
  console.error('Não foi possível encontrar o Docker (tentei "docker compose", "docker-compose" e via WSL). Ele está instalado e em execução?')
  process.exit(1)
}

const [comandoDocker, ...prefixoDocker] = formaDisponivel
const docker = spawnSync(comandoDocker, [...prefixoDocker, ...argumentosDocker], { stdio: 'inherit', shell: true })
if (docker.status !== 0) {
  console.error('Não foi possível subir o banco de dados. Veja a mensagem do Docker acima.')
  process.exit(docker.status ?? 1)
}

// 2. Roda os apps em modo dev — a API lê a variável PERFIL para escolher o .env
const apps = spawn('pnpm', ['--parallel', '-r', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, ...(perfil ? { PERFIL: perfil } : {}) },
})

apps.on('exit', (codigo) => process.exit(codigo ?? 0))
