import swaggerJSDoc from 'swagger-jsdoc'
import { OpenAPIV3 } from 'openapi-types'

import { config } from '@infrastructure/config/config.js'

const pkg = await import('../../../package.json', {
  assert: { type: 'json' },
})
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
                        type: 'array',
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
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Supply the access token in the Authorization header as: Bearer <token>'.concat(
              config.isDev ? '\nIssued tokens are short-lived; refresh via auth endpoints.' : '',
            ),
        },
      },
      responses: {
        SystemError: {
          description: 'System Error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorFormat',
              },
            },
          },
        },
        UnauthorizedError: {
          description: 'Unauthorized - Invalid or missing token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorFormat',
              },
            },
          },
        },
      },
    },
  },
  apis: [`${config.rootDir}/src/api/routes/**/*.ts`],
}) as OpenAPIV3.Document
