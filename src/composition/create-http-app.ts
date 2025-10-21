import { createRequire } from 'node:module'

import express, { Express, Request, Response } from 'express'
import { OpenAPIV3 } from 'openapi-types'
import cookieParser from 'cookie-parser'

import { AppDependencies } from '@composition/create-deps.js'
import { errorHandler } from '@api/middlewares/error-handler.middleware.js'
import { swaggerSpec } from '@api/docs/swagger.js'
import { patchPaths } from '@api/docs/patchPaths.js'
import { createV1Router } from '@api/routes/v1.routes.js'
import { createShortenerRouter } from '@api/routes/shortener.routes.js'
import { createRedirectRoutes } from '@api/routes/redirect.routes.js'
import { createAuthRouter } from '@api/routes/auth.routes.js'
import { createMeRouter } from '@api/routes/me.routes.js'

const require = createRequire(import.meta.url)
const swaggerUi = require('swagger-ui-express')
const OpenApiValidator = require('express-openapi-validator')

/**
 * Creates an Express application with API and redirect routes.
 * @param {AppDependencies} deps - The dependencies for the application.
 * @returns {Express} - The configured Express application.
 */
export function createHttpApp(deps: AppDependencies): Express {
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
  app.use(cookieParser())
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
  const apiRouter = createV1Router(
    createShortenerRouter(deps.controllers.shortenerController),
    createMeRouter(deps.controllers.shortenerController, deps.jwtService),
    createAuthRouter(deps.controllers.authController, deps.uow, deps.jwtService),
  )

  const redirectRouter = createRedirectRoutes(deps.controllers.shortenerController)

  app.use('/api', apiRouter)
  app.use('/', redirectRouter)

  // Global error handler
  app.use(errorHandler)

  return app
}
