import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { VitePluginNode } from 'vite-plugin-node'

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    watch: {
      usePolling: true,
      interval: 100
    }
  },
  plugins: [
    tsconfigPaths(),
    VitePluginNode({
      adapter: 'express',
      appPath: './src/server.dev.ts',
      exportName: 'viteNodeApp',
      tsCompiler: 'esbuild',
      initAppOnBoot: true,
      reloadAppOnFileChange: true
    })
  ],
  ssr: {
    noExternal: ["express-openapi-validator", "swagger-ui-express"],
  },
})
