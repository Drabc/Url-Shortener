import { RedisOptions, Redis } from 'ioredis'
import { Db, MongoClient } from 'mongodb'

import { createApp } from '@presentation/app.js'
import { ShortenerController } from '@presentation/controllers/shortener.controller.js'
import { createShortenerRouter } from '@presentation/routes/shortener.routes.js'
import { createV1Router } from '@presentation/routes/v1.routes.js'
import { createRedirectRoutes } from '@presentation/routes/redirect.routes.js'
import { ShortenerService } from '@application/services/shortener.service.js'
import { config, Clients } from '@infrastructure/config/config.js'
import { RedisShortUrlRepository } from '@infrastructure/repositories/redis-short-url.repository.js'
import { logger } from '@infrastructure/logging/logger.js'
import { MigrationRunner } from '@infrastructure/db/migrations/migration-runner.js'
import { MigrationPlanner } from '@infrastructure/db/migrations/migration-planner.js'

bootstrap().catch((err) => {
  logger.error(err)
  process.exit(1)
})

/**
 * Bootstraps the application
 */
async function bootstrap() {
  const clientRegistry = await getClientRegistry()

  const migrationRunner = new MigrationRunner(
    new MigrationPlanner(config.migrationsPath),
    logger,
  )

  logger.info('Starting migrations...')
  await migrationRunner.run(clientRegistry)

  const redisRepository = new RedisShortUrlRepository(
    clientRegistry.redis as Redis,
  )
  const shortenerService = new ShortenerService(redisRepository, config.baseUrl)
  const shortenerController = new ShortenerController(shortenerService)
  const apiRouter = createV1Router(createShortenerRouter(shortenerController))

  const redirectRouter = createRedirectRoutes(shortenerController)

  const app = createApp({ apiRouter, redirectRouter })

  const server = app.listen(config.port, () => {
    logger.info(`Server is running on port ${config.port}`)
  })

  const shutdown = async (signal: string, code = 0) => {
    logger.info(`${signal} received — shutting down...`)
    server.close(() => logger.info('HTTP server closed'))
    try {
      // Temporary. Will need to abstract to clients cleanup
      await (clientRegistry.redis as Redis).quit()
      logger.info('Redis client disconnected')
    } catch (e) {
      logger.error({ e }, 'Error during Redis shutdown')
    }
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
 * Initializes and returns a registry of client instances based on configuration.
 * @returns {Promise<Partial<Clients>>} A registry containing initialized clients.
 */
async function getClientRegistry(): Promise<Partial<Clients>> {
  const registry: Partial<Clients> = {}

  for (const type of config.clientTypes) {
    // Simple registry initialization. Abstract if needed
    if (type === 'mongo') {
      registry[type] = await createMongoClient()
    } else if (type === 'redis') {
      const redisOptions: RedisOptions = {
        host: config.redisHost,
        password: config.redisPassword,
        username: config.redisUsername,
      }

      logger.info('Connecting to Redis...')
      registry[type] = new Redis(redisOptions)
    }
  }

  return registry
}

/**
 * Creates and connects to MongoDB client
 * @returns {Promise<Db>} Connected MongoDB database instance
 */
async function createMongoClient(): Promise<Db> {
  const client = new MongoClient(config.mongoEndpoint, {
    auth: {
      username: config.mongoUsername,
      password: config.mongoPassword,
    },
  })

  logger.info('Connecting to MongoDB...')
  await client.connect()

  return client.db(config.mongoDb)
}
