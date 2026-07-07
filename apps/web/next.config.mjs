import { fileURLToPath } from 'node:url'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpila o pacote compartilhado do monorepo — ele exporta .ts puro
  // (sem build step), então o Next.js precisa compilá-lo junto
  transpilePackages: ['@esqueleton/shared'],
  // Raiz do monorepo — evita que o Next confunda a raiz do workspace quando
  // existe outro pnpm-lock.yaml fora do projeto (ex: um solto em D:\)
  outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
}

export default nextConfig
