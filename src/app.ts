import express, { Express, Router } from 'express'

import { errorHandler } from './middlewares/error-handler.middleware.js'

interface AppDeps {
  apiRouter: Router
  redirectRouter: Router
}

export function createApp({ apiRouter, redirectRouter }: AppDeps): Express {
  const app: Express = express()

  // middlewares
  app.use(express.json())

  // Routes
  app.use('/api', apiRouter)
  app.use('/', redirectRouter)

  // Global error handler
  app.use(errorHandler)

  return app
}
