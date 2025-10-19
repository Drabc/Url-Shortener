import { createServer, Server } from 'http'
import { resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

import chokidar from 'chokidar'

import { clock } from '@application/shared/clock.js'
import { bootstrap } from '@composition/bootstrap.js'
import { createDeps } from '@composition/create-deps.js'
import { createHttpApp } from '@composition/createHttpApp.js'
import { config } from '@infrastructure/config/config.js'
import { logger } from '@infrastructure/logging/logger.js'
import { PersistenceConnections } from '@infrastructure/clients/persistence-connections.js'

type CachedAppState = {
  server: Server
  connections: PersistenceConnections
}

declare global {
  var __APP_STATE__: CachedAppState | undefined
}

main().catch((err) => {
  logger.error(err)
  process.exit(1)
})

/**
 * Server entry point.
 * In dev: enables hot reloading without re‑initializing infrastructure connections.
 */
async function main() {
  if (config.isDev && global.__APP_STATE__) {
    logger.info('Reusing existing connections (hot reload).')
    // Nothing else; file was re-evaluated, watcher already running.
    return
  }

  const connections = await bootstrap(config, logger)
  const deps = await createDeps(config, connections, clock, logger)
  const app = createHttpApp(deps)

  const server = createServer(app)

  server.listen(config.port, () => {
    logger.info(`Server is running on port ${config.port}`)
  })

  setupSignals(server, connections)

  if (config.isDev) {
    global.__APP_STATE__ = { server, connections }
    enableHotReload()
  }
}

/**
 * Setup OS and process signal handlers for graceful, ordered shutdown.
 * @param {Server} server HTTP server instance to be closed.
 * @param {PersistenceConnections} connections Active infrastructure connections container to disconnect.
 */
function setupSignals(server: Server, connections: PersistenceConnections) {
  const shutdown = async (signal: string, code = 0) => {
    logger.info(`${signal} received — shutting down...`)
    server.close(() => logger.info('HTTP server closed'))
    await connections.disconnectAll()
    process.exit(code)
  }

  process.on('SIGINT', () => shutdown('SIGINT', 0))
  process.on('SIGTERM', () => shutdown('SIGTERM', 0))
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason)
    shutdown('unhandledRejection', 1)
  })
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err)
    shutdown('uncaughtException', 1)
  })
}

/**
 * Hot reload: rebuilds Express app on source changes without redoing connections.
 */
function enableHotReload() {
  const watchPaths = [
    'src/api',
    'src/application',
    'src/domain',
    'src/infrastructure',
    'src/composition',
  ]

  logger.info('Hot reload enabled (watching app layers).')

  const watcher = chokidar.watch(watchPaths, {
    ignoreInitial: true,
    persistent: true,
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  watcher.on('all', async (_event, _path) => {
    // Debounce quick bursts
    await new Promise((r) => setTimeout(r, 25))

    if (!global.__APP_STATE__) return
    const { server, connections } = global.__APP_STATE__

    try {
      logger.info('Reloading application layer...')

      // Re-import the createHttpApp factory fresh
      const { createHttpApp: freshCreateHttpApp } = await dynamicImportFresh(
        'composition/createHttpApp.js',
      )
      const { createDeps: freshCreateDeps } = await dynamicImportFresh('composition/create-deps.js')

      const newDeps = await freshCreateDeps(config, connections, clock, logger)
      const newApp = freshCreateHttpApp(newDeps)

      // Replace the existing request handler(s)
      server.removeAllListeners('request')
      server.on('request', newApp)

      logger.info('Hot reload complete.')
    } catch (err) {
      logger.error('Hot reload failed:', err)
    }
  })
}

/**
 * Dynamically imports a module with a cache‑busting query to force a fresh load.
 * @param {string} specifier Module specifier relative to this file.
 * @returns {Promise<unknown>} Module namespace object freshly imported.
 */
async function dynamicImportFresh(specifier: string) {
  const abs = resolve(fileURLToPath(import.meta.url), '..', specifier)
  const url = pathToFileURL(abs).href + `?v=${Date.now()}`
  return import(url)
}
