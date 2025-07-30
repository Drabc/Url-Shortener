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
    components: {
      schemas: {
        ErrorFormat: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                code: { type: 'integer' },
                message: { type: 'string' },
                details: {
                  type: 'object',
                  properties: {
                    url: { type: 'string' },
                    ...(config.isDev && {
                      stack: {
                        type: 'string',
                        description: 'Full stack trace (Dev only)',
                      },
                    }),
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/**/*.ts'],
}) as OpenAPIV3.Document
