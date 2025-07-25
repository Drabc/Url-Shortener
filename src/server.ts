import { RedisOptions, Redis } from 'ioredis'
import { createApp } from './app.js'
import { ShortenerController } from './controllers/shortener.controller.js'
import { createShortenerRouter } from './routes/shortener.routes.js'
import { createV1Router } from './routes/v1.routes.js'
import { ShortenerService } from './services/shortener.services.js'
import { config } from './config/config.js'
import { RedisRepository } from './repositories/redis.repository.js'
import { createRedirectRoutes } from './routes/redirect.routes.js'

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})

async function bootstrap() {

  const redisOptions: RedisOptions = {
    host: config.redisHost,
    password: config.redisPassword,
    username: config.redisUsername
  }

  const redisClient = new Redis(redisOptions)
  const redisRepository = new RedisRepository(redisClient)
  const shortenerService = new ShortenerService(redisRepository)
  const shortenerController = new ShortenerController(shortenerService)
  const apiRouter = createV1Router(createShortenerRouter(shortenerController))

  const redirectRouter = createRedirectRoutes(shortenerController)

  const app = createApp({ apiRouter, redirectRouter})

  const server = app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`)
  })

  const shutdown = async (signal: string, code = 0) => {
    console.info(`${signal} received — shutting down...`)
    server.close(() => console.info('HTTP server closed'))
    try {
      await redisClient.quit()
      console.info('Redis client disconnected')
    } catch (e) {
      console.error({ e }, 'Error during Redis shutdown')
    }
    process.exit(code)
  }

  process.on('SIGINT', () => shutdown('SIGINT', 0))
  process.on('SIGTERM', () => shutdown('SIGTERM', 0))

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason)
    shutdown('unhandledRejection', 1)
  })

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
    shutdown('uncaughtException', 1)
  })
}
