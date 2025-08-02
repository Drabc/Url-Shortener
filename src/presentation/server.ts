import { RedisOptions, Redis } from 'ioredis'

import { createApp } from '@presentation/app.js'
import { ShortenerController } from '@presentation/controllers/shortener.controller.js'
import { createShortenerRouter } from '@presentation/routes/shortener.routes.js'
import { createV1Router } from '@presentation/routes/v1.routes.js'
import { createRedirectRoutes } from '@presentation/routes/redirect.routes.js'
import { ShortenerService } from '@application/services/shortener.service.js'
import { config } from '@infrastructure/config/config.js'
import { RedisShortUrlRepository } from '@infrastructure/repositories/redis-short-url.repository.js'
import { logger } from '@infrastructure/logging/logger.js'

bootstrap().catch((err) => {
  logger.error(err)
  process.exit(1)
})

/**
 * Bootstraps the application
 */
async function bootstrap() {
  const redisOptions: RedisOptions = {
    host: config.redisHost,
    password: config.redisPassword,
    username: config.redisUsername,
  }

  const redisClient = new Redis(redisOptions)
  const redisRepository = new RedisShortUrlRepository(redisClient)
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
      await redisClient.quit()
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
