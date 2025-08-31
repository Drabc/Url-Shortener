import { createApp } from '@presentation/app.js'
import { ShortenerController } from '@presentation/controllers/shortener.controller.js'
import { createShortenerRouter } from '@presentation/routes/shortener.routes.js'
import { createV1Router } from '@presentation/routes/v1.routes.js'
import { createRedirectRoutes } from '@presentation/routes/redirect.routes.js'
import { createUserRouter } from '@presentation/routes/user.routes.js'
import { UserController } from '@presentation/controllers/users.controller.js'
import { ShortenerService } from '@application/services/shortener.service.js'
import { RegisterUser } from '@application/use-cases/register-user.use-case.js'
import { clock } from '@application/shared/clock.js'
import { config } from '@infrastructure/config/config.js'
// import { RedisShortUrlRepository } from '@infrastructure/repositories/url/redis-short-url.repository.js'
import { logger } from '@infrastructure/logging/logger.js'
import { MigrationRunner } from '@infrastructure/db/migrations/migration-runner.js'
import { MigrationPlanner } from '@infrastructure/db/migrations/migration-planner.js'
import { createPersistenceConnections } from '@infrastructure/clients/persistence-connections.js'
import {
  // MONGO_CLIENT,
  POSTGRES_CLIENT,
  // REDIS_CLIENT,
} from '@infrastructure/constants.js'
// import { MongoShortUrlRepository } from '@infrastructure/repositories/url/mongo-short-url.repository.js'
import { PostgresShortUrlRepository } from '@infrastructure/repositories/url/postgres-short-url.repository.js'
import { PostgresUserRepository } from '@infrastructure/repositories/user/postgres-user.repository.js'
import { Argon2PasswordHasher } from '@infrastructure/adapters/argon2-password-hasher.adapter.js'

bootstrap().catch((err) => {
  logger.error(err)
  process.exit(1)
})

/**
 * Bootstraps the application
 */
async function bootstrap() {
  const persistenceConnections = await createPersistenceConnections(config, logger)

  const migrationRunner = new MigrationRunner(new MigrationPlanner(config.migrationsPath), logger)

  logger.info('Checking for migrations...')
  await migrationRunner.run(persistenceConnections)

  // const mongoClient = persistenceConnections.get(MONGO_CLIENT)
  const postgresClient = persistenceConnections.get(POSTGRES_CLIENT)
  const shortUrlRepository = new PostgresShortUrlRepository(postgresClient)
  const userRepository = new PostgresUserRepository(postgresClient)
  // The below is to switch between clients
  // if (postgresClient) {
  // shortUrlRepository = new PostgresShortUrlRepository(postgresClient)
  // } else if (mongoClient) {
  // shortUrlRepository = new MongoShortUrlRepository(mongoClient)
  // } else {
  // shortUrlRepository = new RedisShortUrlRepository(
  // persistenceConnections.get(REDIS_CLIENT),
  // )
  // }

  const hasher = new Argon2PasswordHasher(config.pepper)
  const registerUser = new RegisterUser(userRepository, hasher, clock)
  const userController = new UserController(registerUser)

  const shortenerService = new ShortenerService(shortUrlRepository, config.baseUrl)
  const shortenerController = new ShortenerController(shortenerService)

  const apiRouter = createV1Router(
    createShortenerRouter(shortenerController),
    createUserRouter(userController),
  )

  const redirectRouter = createRedirectRoutes(shortenerController)

  const app = createApp({ apiRouter, redirectRouter })

  const server = app.listen(config.port, () => {
    logger.info(`Server is running on port ${config.port}`)
  })

  const shutdown = async (signal: string, code = 0) => {
    logger.info(`${signal} received — shutting down...`)
    server.close(() => logger.info('HTTP server closed'))
    await persistenceConnections.disconnectAll()
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
