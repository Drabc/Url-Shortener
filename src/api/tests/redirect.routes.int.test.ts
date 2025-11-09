import request from 'supertest'
import type { Express } from 'express'

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
import { PgClient } from '@infrastructure/clients/pg-client.js'
import { POSTGRES_CLIENT } from '@infrastructure/constants.js'

/**
 * Integration tests for GET /:code redirect endpoint.
 */
describe('GET /:code (redirect)', () => {
  let connections: PersistenceConnections
  let app: Express
  let pg: PgClient

  beforeAll(async () => {
    connections = await createPersistenceConnections(config, logger, {
      pg: createPgClientOverwrite,
    })
    const deps = await createDeps(config, connections, clock, logger)
    app = createHttpApp(deps)
    pg = connections.get(POSTGRES_CLIENT)
  })

  afterAll(async () => connections.disconnectAll())

  beforeEach(async () => await pg.query('BEGIN'))
  afterEach(async () => await pg.query('ROLLBACK'))

  /**
   * Creates a short URL code for the provided long URL via the shorten API.
   * @param {string} longUrl The original URL to shorten.
   * @returns {Promise<string>} The generated short code segment (portion after the last slash).
   */
  async function createShortUrl(longUrl: string): Promise<string> {
    const res = await request(app).post('/api/v1/shorten').send({ url: longUrl })
    expect(res.status).toBe(201)
    return res.body.shortUrl.slice(res.body.shortUrl.lastIndexOf('/') + 1)
  }

  it('redirects to original URL for existing code', async () => {
    const target = 'https://example.com/redirect/path?x=1'
    const code = await createShortUrl(target)

    const res = await request(app).get(`/${code}`).redirects(0)
    expect(res.status).toBeGreaterThanOrEqual(301)
    expect(res.status).toBeLessThan(309) // accommodate possible 302 depending on express config
    // Express sets Location header on redirect
    expect(res.headers.location).toBe(target)
  })

  it('returns error payload for unknown code', async () => {
    const res = await request(app).get('/unknownCODE').redirects(0)
    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({
      error: {
        code: res.status,
        message: expect.any(String),
        type: expect.any(String),
      },
    })
  })
})
