import swaggerJSDoc from 'swagger-jsdoc'
import { OpenAPIV3 } from 'openapi-types'

import { config } from './config/config.js'

const pkg = await import('../package.json', { assert: { type: 'json' } })
const version = pkg.default.version as string

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.1.1',
    info: {
      title: 'URL Shortener API',
      version,
      description: 'A simple URL shortener API built with Node.js and Express',
    },
    servers: [{ url: config.baseUrl }],
  },
  apis: ['./routes/redirect.routes.ts', './routes/v1.routes.ts'],
}) as OpenAPIV3.Document
