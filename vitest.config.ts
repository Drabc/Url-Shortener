import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    tsconfigPaths(),
  ],
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test'
    },
    globals: true,
    include: ['**/?(*.)+(spec|test).+(ts|tsx)'],
    pool: 'threads',
    maxWorkers: '100%',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text'],
      reportsDirectory: './coverage',
      include: ['src/**'],
      exclude: [
        'src/server.dev.ts',
        'src/server.ts',
        'src/infrastructure/db/migrations/postgres/**',
        'src/infrastructure/db/migrations/mongo/**',
        'src/**/*.error.ts',
      ],
    },
    testTimeout: 20000,
  },
  ssr: {
    noExternal: ['nanoid'],
  },
  optimizeDeps: {
    include: ['nanoid'],
  },
})
