import { importPKCS8, importSPKI } from 'jose'
import { Logger } from 'pino'

import { JwtService } from '@infrastructure/auth/jwt.service.js'
import { PersistenceConnections } from '@infrastructure/clients/persistence-connections.js'
import { Config } from '@infrastructure/config/config.js'
import { POSTGRES_CLIENT, RATE_LIMIT_CLIENT, REDIS_CLIENT } from '@infrastructure/constants.js'
import { PgUnitOfWork } from '@infrastructure/db/pg-unit-of-work.js'
import { PostgresSessionRepository } from '@infrastructure/repositories/session/postgres-session.repository.js'
import { PostgresShortUrlRepository } from '@infrastructure/repositories/url/postgres-short-url.repository.js'
import { RedisShortUrlRepository } from '@infrastructure/repositories/url/redis-short-url.repository.js'
import { ShortUrlRepositorySelector } from '@infrastructure/repositories/url/short-url-repository-selector.js'
import { PostgresUserRepository } from '@infrastructure/repositories/user/postgres-user.repository.js'
import { Clock } from '@application/shared/clock.js'
import { Argon2PasswordHasher } from '@infrastructure/auth/argon2-password-hasher.adapter.js'
import { RegisterUser } from '@application/use-cases/register-user.use-case.js'
import { LoginUser } from '@application/use-cases/login-user.use-case.js'
import { LogoutUser } from '@application/use-cases/logout-user.use-case.js'
import { RefreshTokenUseCase } from '@application/use-cases/refresh-token.use-case.js'
import { HmacTokenDigester } from '@infrastructure/auth/hmac-token-digester.js'
import { RefreshSecretGenerator } from '@infrastructure/auth/refresh-secret-generator.js'
import { AuthController } from '@api/controllers/auth.controller.js'
import { CookieFormatter } from '@api/utils/cookie-formatter.js'
import { ShortenUrl } from '@application/use-cases/shorten-url.use-case.js'
import { ResolveUrl } from '@application/use-cases/resolve-url.use-case.js'
import { ShortenerController } from '@api/controllers/shortener.controller.js'
import { RateLimiterService } from '@infrastructure/rate-limit/rate-limiter.service.js'
import { createRateLimitMiddlewareFactory } from '@api/middlewares/rate-limit/rate-limit.middleware.js'

/**
 * Application dependencies container returned by createDeps function.
 */
export interface AppDependencies {
  uow: PgUnitOfWork
  services: { jwtService: JwtService }
  factories: { rateLimitMiddlewareFactory: ReturnType<typeof createRateLimitMiddlewareFactory> }
  controllers: {
    authController: AuthController
    shortenerController: ShortenerController
  }
}

/**
 * Creates and wires application dependencies including repositories, services and controllers.
 * @param {Config} config Application configuration values.
 * @param {PersistenceConnections} connections Persistence connections containing initialized database/cache clients.
 * @param {Clock} clock Clock abstraction for time-based operations.
 * @param {Logger} logger Logger instance used for instrumentation.
 * @returns {Promise<AppDependencies>} Object containing the unit of work and controllers.
 */
export async function createDeps(
  config: Config,
  connections: PersistenceConnections,
  clock: Clock,
  logger: Logger,
): Promise<AppDependencies> {
  // Initialize persistence clients
  const postgresClient = connections.get(POSTGRES_CLIENT)
  const redisClient = connections.get(REDIS_CLIENT)
  const rateLimitClient = connections.get(RATE_LIMIT_CLIENT)

  // Initialize repositories
  const postgresShortUrlRepository = new PostgresShortUrlRepository(postgresClient)
  const redisShortUrlRepository = new RedisShortUrlRepository(redisClient)
  const shortUrlRepository = new ShortUrlRepositorySelector(
    redisShortUrlRepository,
    postgresShortUrlRepository,
  )

  const userRepository = new PostgresUserRepository(postgresClient)
  const sessionRepo = new PostgresSessionRepository(postgresClient)

  // Transaction Boundary
  const uow = new PgUnitOfWork(postgresClient)

  const accessTokenPrivateKey = await importPKCS8(
    config.accessTokenPrivateKey,
    config.accessTokenAlgo,
  )
  const accessTokenPublicKey = await importSPKI(config.accessTokenPublicKey, config.accessTokenAlgo)

  // services
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
  const rateLimiterService = new RateLimiterService(rateLimitClient)
  const rateLimitMiddlewareFactory = createRateLimitMiddlewareFactory(rateLimiterService)

  const hasher = new Argon2PasswordHasher(config.pepper)
  const registerUser = new RegisterUser(userRepository, hasher, clock)
  const tokenDigester = new HmacTokenDigester(config.refreshTokenSecret)
  const loginUser = new LoginUser(
    hasher,
    tokenDigester,
    new RefreshSecretGenerator(),
    jwtService,
    sessionRepo,
    userRepository,
    clock,
    config,
  )
  const logoutUser = new LogoutUser(sessionRepo, tokenDigester, clock)
  const refreshTokenUC = new RefreshTokenUseCase(
    sessionRepo,
    tokenDigester,
    new RefreshSecretGenerator(),
    jwtService,
    clock,
    config.sessionSecretLength,
  )
  const cookieFormatter = new CookieFormatter()
  const authController = new AuthController(
    registerUser,
    loginUser,
    logoutUser,
    refreshTokenUC,
    cookieFormatter,
    config.isNonProd,
  )

  const shortenUrlUC = new ShortenUrl(shortUrlRepository, config.baseUrl)
  const resolveUrlUC = new ResolveUrl(shortUrlRepository)
  const shortenerController = new ShortenerController(shortenUrlUC, resolveUrlUC)

  return {
    uow,
    services: { jwtService },
    factories: { rateLimitMiddlewareFactory },
    controllers: { authController, shortenerController },
  }
}
