import express, { Express, Router, Request, Response } from 'express'
import swaggerUi from 'swagger-ui-express'

import { errorHandler } from './middlewares/error-handler.middleware.js'
import { swaggerSpec } from './swagger.js'
import { patchPaths } from './helpers/patchPaths.js'

interface AppDeps {
  apiRouter: Router
  redirectRouter: Router
}

export function createApp({ apiRouter, redirectRouter }: AppDeps): Express {
  const app: Express = express()

  // docs
  app.get('/openapi.json', (_req: Request, res: Response) => {
    const spec = { ...swaggerSpec }
    // Allows to define swagger-jsdocs without specifiying api version
    spec.paths = patchPaths(spec.paths, '/api/v1')
    res.json(spec)
  })
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, { swaggerOptions: { url: '/openapi.json' } }),
  )

  // middlewares
  app.use(express.json())

  // Routes
  app.use('/api', apiRouter)
  app.use('/', redirectRouter)

  // Global error handler
  app.use(errorHandler)

  return app
}
