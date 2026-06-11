// Configuração dos testes da API — roda com "pnpm --filter @esqueleton/api test"
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
