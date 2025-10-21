import { config } from '@infrastructure/config/config.js'
import { logger } from '@infrastructure/logging/logger.js'
import { clock } from '@application/shared/clock.js'
import type { PersistenceConnections } from '@infrastructure/clients/persistence-connections.js'
import { createDeps } from '@composition/create-deps.js'
import { bootstrap } from '@composition/bootstrap.js'
import { createHttpApp } from '@composition/create-http-app.js'

type CachedAppState = {
  connections: PersistenceConnections
}

declare global {
  var __APP_STATE__: CachedAppState | undefined
}

const main = async () => {
  // Check if connections already exist from a previous reload
  if (globalThis.__APP_STATE__) {
    logger.info('Reusing existing connections (hot reload).')
  } else {
    logger.info('Initializing new connections...')
    const connections = await bootstrap(config, logger)
    globalThis.__APP_STATE__ = { connections }
  }

  const connections = globalThis.__APP_STATE__.connections
  const deps = await createDeps(config, connections, clock, logger)
  const app = createHttpApp(deps)

  return app
}

export const viteNodeApp = await main()
