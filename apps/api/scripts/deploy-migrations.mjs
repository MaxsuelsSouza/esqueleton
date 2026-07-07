// Aplica as migrações pendentes do Prisma no banco durante o deploy na Vercel.
//
// Por que existe: o build da API na Vercel usa o builder @vercel/node, que compila
// o entrypoint mas NÃO roda um script de build do package.json. Sem isto, o código
// era deployado esperando colunas novas que o banco de produção ainda não tinha —
// causando erros "column does not exist" em toda query (ex: StoreProfile).
//
// Segurança:
//   - Roda SOMENTE no ambiente da Vercel (VERCEL=1). No `pnpm install` local ele é
//     pulado, para nunca tocar num banco de desenvolvimento sem querer.
//   - `prisma migrate deploy` é idempotente: aplica apenas o que está pendente e
//     nunca recria dados. Rodá-lo em todo deploy é seguro.
import { execSync } from 'node:child_process'
import { setTimeout as esperar } from 'node:timers/promises'

if (!process.env.VERCEL) {
  console.log('[migrations] Fora da Vercel — pulando migrate deploy (em dev, rode `pnpm --filter @esqueleton/api db:migrate`).')
  process.exit(0)
}

if (!process.env.DATABASE_URL) {
  console.log('[migrations] DATABASE_URL ausente — pulando migrate deploy.')
  process.exit(0)
}

// O banco (Neon) hiberna quando ocioso e demora alguns segundos para acordar —
// a primeira tentativa pode estourar o timeout do advisory lock do Prisma (P1002).
// Tentamos algumas vezes com espera entre elas antes de derrubar o deploy.
const TENTATIVAS = 3
const ESPERA_ENTRE_TENTATIVAS_MS = 15000

console.log('[migrations] Aplicando migrações pendentes no banco de produção...')
for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
  try {
    execSync('prisma migrate deploy', { stdio: 'inherit' })
    console.log('[migrations] Migrações aplicadas.')
    process.exit(0)
  } catch (erro) {
    if (tentativa === TENTATIVAS) {
      console.error(`[migrations] Falha após ${TENTATIVAS} tentativas — abortando o deploy.`)
      throw erro
    }
    console.warn(`[migrations] Tentativa ${tentativa} falhou (banco pode estar acordando) — nova tentativa em ${ESPERA_ENTRE_TENTATIVAS_MS / 1000}s...`)
    await esperar(ESPERA_ENTRE_TENTATIVAS_MS)
  }
}
