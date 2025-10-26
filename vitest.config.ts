import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    tsconfigPaths(),
  ],
  test: {
    environment: 'node',
    globals: true,
    include: ['**/?(*.)+(spec|test).+(ts|tsx)'],
    pool: 'threads',
    maxWorkers: '100%',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
    },
  },
  ssr: {
    noExternal: ['nanoid'],
  },
  optimizeDeps: {
    include: ['nanoid'],
  },
})
