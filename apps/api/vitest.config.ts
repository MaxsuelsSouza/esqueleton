// Configuração dos testes da API — roda com "pnpm --filter @esqueleton/api test"
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Remove chaves reais do .env antes de cada arquivo de teste —
    // sem isso os testes enviariam e-mails e uploads de verdade
    setupFiles: ['src/test/setup-env.ts'],
  },
})
