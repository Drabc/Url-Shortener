import express, { Express, Router, Request, Response } from 'express'
import swaggerUi from 'swagger-ui-express'
import OpenApiValidator from 'express-openapi-validator'
import { OpenAPIV3 } from 'openapi-types'

import { errorHandler } from '@presentation/middlewares/error-handler.middleware.js'
import { swaggerSpec } from '@presentation/docs/swagger.js'
import { patchPaths } from '@presentation/docs/patchPaths.js'

interface AppDeps {
  apiRouter: Router
  redirectRouter: Router
}

/**
 * Creates an Express application with API and redirect routes.
 * @param {AppDeps} deps - The dependencies for the application.
 * @returns {Express} - The configured Express application.
 */
export function createApp({ apiRouter, redirectRouter }: AppDeps): Express {
  const app: Express = express()

  // Augment swagger spec with API version
  // Allows to define swagger-jsdoc without specifying api version
  const spec: OpenAPIV3.Document = { ...swaggerSpec }
  spec.paths = patchPaths(spec.paths, '/api/v1')

  // docs
  app.get('/openapi.json', (_req: Request, res: Response) => {
    res.json(spec)
  })

  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(spec, { swaggerOptions: { url: '/openapi.json' } }),
  )

  // middlewares
  app.use(express.json())

  app.use(
    OpenApiValidator.middleware({
      // The proper interface is not exported by OpenApiValidator
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiSpec: spec as any,
      validateRequests: true,
      validateResponses: true,
    }),
  )

  // Routes
  app.use('/api', apiRouter)
  app.use('/', redirectRouter)

  // Global error handler
  app.use(errorHandler)

  return app
}
