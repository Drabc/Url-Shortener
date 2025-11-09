import request from 'supertest'
import type { Express } from 'express'
import type { Redis } from 'ioredis'

import { createHttpApp } from '@composition/create-http-app.js'
import { createDeps } from '@composition/create-deps.js'
import { config } from '@infrastructure/config/config.js'
import {
  createPersistenceConnections,
  PersistenceConnections,
} from '@infrastructure/clients/persistence-connections.js'
import { logger } from '@infrastructure/logging/logger.js'
import { createPgClientOverwrite } from '@api/tests/overwrites/pg-client.overwrite.js'
import { clock } from '@application/shared/clock.js'
import { REDIS_CLIENT } from '@infrastructure/constants.js'

describe('POST /api/v1/shorten', () => {
  let connections: PersistenceConnections
  let app: Express
  let client: Redis

  beforeAll(async () => {
    connections = await createPersistenceConnections(config, logger, {
      pg: createPgClientOverwrite,
    })
    const deps = await createDeps(config, connections, clock, logger)
    client = connections.get(REDIS_CLIENT)
    app = createHttpApp(deps)
  })

  afterAll(async () => await connections.disconnectAll())

  it('creates a short url from a valid long url', async () => {
    const longUrl = 'https://example.com/some/very/long/path?with=query&params=1'

    const res = await request(app).post('/api/v1/shorten').send({ url: longUrl })
    const code = res.body.shortUrl.slice(res.body.shortUrl.lastIndexOf('/') + 1)
    const storageResult = await client.get(code)

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ shortUrl: expect.stringMatching(/\/[a-zA-Z0-9]{10}/) })
    // Ensure the short code part exists after base url
    const shortBase = config.baseUrl.replace(/\/$/, '')
    expect(res.body.shortUrl.startsWith(shortBase)).toBe(true)
    expect(storageResult).toEqual(longUrl)
  })

  it('returns validation error for invalid url', async () => {
    const res = await request(app).post('/api/v1/shorten').send({ url: 'notaurl' })

    expect(res.body).toMatchObject({
      error: {
        code: 422,
        type: 'InvalidUrl',
        message: expect.any(String),
      },
    })

    expect(res.status).toBe(422)
  })
})
