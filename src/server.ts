import { clock } from '@application/shared/clock.js'
import { bootstrap } from '@composition/bootstrap.js'
import { createDeps } from '@composition/create-deps.js'
import { createHttpApp } from '@composition/createHttpApp.js'
import { config } from '@infrastructure/config/config.js'
import { logger } from '@infrastructure/logging/logger.js'

main().catch((err) => {
  logger.error(err)
  process.exit(1)
})

/**
 * Server entry point
 */
async function main() {
  const connections = await bootstrap(config, logger)
  const deps = await createDeps(config, connections, clock, logger)
  const app = createHttpApp(deps)

  const server = app.listen(config.port, () => {
    logger.info(`Server is running on port ${config.port}`)
  })

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
