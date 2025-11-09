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
 * Integration tests for POST /api/v1/auth/refresh endpoint.
 */
describe('POST /api/v1/auth/refresh', () => {
  let connections: PersistenceConnections
  let app: Express
  let client: PgClient

  beforeAll(async () => {
    connections = await createPersistenceConnections(config, logger, {
      pg: createPgClientOverwrite,
    })
    const deps = await createDeps(config, connections, clock, logger)
    app = createHttpApp(deps)
    client = connections.get(POSTGRES_CLIENT)
  })

  afterAll(async () => connections.disconnectAll())

  beforeEach(async () => await client.query('BEGIN'))
  afterEach(async () => await client.query('ROLLBACK'))

  /**
   * Registers a user then logs them in returning the Set-Cookie refresh-token string.
   * @param {string} email user email
   * @param {string} password plain password
   * @returns {Promise<string>} refresh cookie header value
   */
  async function registerAndLogin(email: string, password: string): Promise<string> {
    // Register
    await request(app).post('/api/v1/auth/register').send({
      id: undefined,
      firstName: 'Ref',
      lastName: 'User',
      email,
      password,
    })

    // Login
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password })
    expect(loginRes.status).toBe(200)
    const cookieHeader = loginRes.headers['set-cookie']
    expect(cookieHeader).toBeTruthy()
    const refreshCookie = Array.isArray(cookieHeader)
      ? cookieHeader.find((c) => c.startsWith('refresh-token='))
      : cookieHeader
    if (!refreshCookie) throw new Error('Missing refresh-token cookie after login')
    return refreshCookie
  }

  it('rotates refresh token and returns new access token', async () => {
    const email = 'refresh.success@example.com'
    const password = 'Str0ng!Pass'
    const oldCookie = await registerAndLogin(email, password)

    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', oldCookie)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ accessToken: expect.stringMatching(/^ey/) })

    const setCookie = res.headers['set-cookie']
    expect(setCookie).toBeTruthy()
    const newCookie = Array.isArray(setCookie)
      ? setCookie.find((c) => c.startsWith('refresh-token='))
      : setCookie
    expect(newCookie).toBeTruthy()
    // Cookie should change (rotation) - value portion before ';'
    const oldValue = oldCookie.split(';')[0]
    const newValue = (newCookie as string).split(';')[0]
    expect(oldValue).not.toBe(newValue)
  })

  it('returns error when refresh token cookie is missing', async () => {
    const res = await request(app).post('/api/v1/auth/refresh')
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({
      error: {
        code: 401,
        message: expect.any(String),
        type: expect.any(String),
      },
    })
  })

  it('returns 401 when refresh token cookie is malformed', async () => {
    const malformed = 'refresh-token=zzzzzz' // invalid hex
    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', malformed)
    // Structured error response
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({
      error: {
        type: 'InvalidSession',
        code: 401,
        message: expect.any(String),
      },
    })
  })
})
