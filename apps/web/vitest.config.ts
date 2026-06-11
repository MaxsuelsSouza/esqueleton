// Configuração dos testes do site — roda com "pnpm --filter @esqueleton/web test"
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      // Mesmos atalhos de importação usados pelo Next.js
      '@': path.resolve(__dirname, 'src'),
      '@esqueleton/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
