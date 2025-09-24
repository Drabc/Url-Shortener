import { importPKCS8, importSPKI } from 'jose'

import { createApp } from '@presentation/app.js'
import { ShortenerController } from '@presentation/controllers/shortener.controller.js'
import { createShortenerRouter } from '@presentation/routes/shortener.routes.js'
import { createV1Router } from '@presentation/routes/v1.routes.js'
import { createRedirectRoutes } from '@presentation/routes/redirect.routes.js'
import { createAuthRouter } from '@presentation/routes/auth.routes.js'
import { createMeRouter } from '@presentation/routes/me.routes.js'
import { AuthController } from '@presentation/controllers/auth.controller.js'
import { ShortenUrl } from '@application/use-cases/shorten-url.use-case.js'
import { ResolveUrl } from '@application/use-cases/resolve-url.use-case.js'
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
import { Argon2PasswordHasher } from '@infrastructure/auth/argon2-password-hasher.adapter.js'
import { LoginUser } from '@application/use-cases/login-user.use-case.js'
import { HmacTokenDigester } from '@infrastructure/auth/hmac-token-digester.js'
import { RefreshSecretGenerator } from '@infrastructure/auth/refresh-secret-generator.js'
import { JwtService } from '@infrastructure/auth/jwt.service.js'
import { PostgresSessionRepository } from '@infrastructure/repositories/session/postgres-session.repository.js'
import { PgUnitOfWork } from '@infrastructure/db/pg-unit-of-work.js'

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

  // TODO: Clean up deps definition
  // const mongoClient = persistenceConnections.get(MONGO_CLIENT)
  const postgresClient = persistenceConnections.get(POSTGRES_CLIENT)
  const shortUrlRepository = new PostgresShortUrlRepository(postgresClient)
  const userRepository = new PostgresUserRepository(postgresClient)
  const sessionRepo = new PostgresSessionRepository(postgresClient)

  // Transaction Boundary
  const uow = new PgUnitOfWork(postgresClient)

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

  const accessTokenPrivateKey = await importPKCS8(
    config.accessTokenPrivateKey,
    config.accessTokenAlgo,
  )
  const accessTokenPublicKey = await importSPKI(config.accessTokenPublicKey, config.accessTokenAlgo)

  const jwtService = new JwtService(
    config.accessTokenIssuer,
    config.accessTokenAudience,
    config.accessTokenAlgo,
    config.accessTokenTtl,
    accessTokenPrivateKey,
    accessTokenPublicKey,
    clock,
    logger,
  )
  const hasher = new Argon2PasswordHasher(config.pepper)
  const registerUser = new RegisterUser(userRepository, hasher, clock)
  const loginUser = new LoginUser(
    hasher,
    new HmacTokenDigester(config.refreshTokenSecret),
    new RefreshSecretGenerator(),
    jwtService,
    sessionRepo,
    userRepository,
    clock,
    config,
  )
  const authController = new AuthController(registerUser, loginUser, config.isDev)

  const shortenUrlUC = new ShortenUrl(shortUrlRepository, config.baseUrl)
  const resolveUrlUC = new ResolveUrl(shortUrlRepository)
  const shortenerController = new ShortenerController(shortenUrlUC, resolveUrlUC)

  const apiRouter = createV1Router(
    createShortenerRouter(shortenerController),
    createMeRouter(shortenerController, jwtService),
    createAuthRouter(authController, uow),
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
