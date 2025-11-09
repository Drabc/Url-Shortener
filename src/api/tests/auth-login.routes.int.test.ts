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
 * Integration tests for POST /api/v1/auth/login endpoint.
 */
describe('POST /api/v1/auth/login', () => {
  let connections: PersistenceConnections
  let app: Express
  let client: PgClient

  beforeAll(async () => {
    connections = await createPersistenceConnections(config, logger, {
      pg: createPgClientOverwrite,
    })
    client = connections.get(POSTGRES_CLIENT)
    const deps = await createDeps(config, connections, clock, logger)
    app = createHttpApp(deps)
  })

  afterAll(async () => await connections.disconnectAll())

  beforeEach(async () => await client.query('BEGIN'))
  afterEach(async () => await client.query('ROLLBACK'))

  /**
   * Helper to register a user for login tests.
   * @param {string} email User email
   * @param {string} password Plain password
   */
  async function registerUser(email: string, password: string) {
    await request(app).post('/api/v1/auth/register').send({
      id: undefined,
      firstName: 'Login',
      lastName: 'User',
      email,
      password,
    })
  }

  it('logs in a registered user returning access token and sets refresh cookie', async () => {
    const email = 'login.success@example.com'
    const password = 'Str0ng!Pass'
    await registerUser(email, password)

    const res = await request(app).post('/api/v1/auth/login').send({ email, password })

    const dbResult = await client.findMany(
      `
        SELECT *
        FROM app.users u
        JOIN auth.sessions s on s.user_id = u.id
        JOIN auth.refresh_tokens rt on rt.session_id = s.id
        WHERE u.email = $1
      `,
      [email],
    )

    const now = new Date()
    const expiresAt = new Date(dbResult[0]?.expires_at)

    expect(dbResult.length).toBe(1)
    expect(expiresAt.getTime()).toBeGreaterThan(now.getTime())
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ accessToken: expect.stringMatching(/^ey/) })
    // Verify refresh cookie header present
    const setCookie = res.headers['set-cookie']
    expect(setCookie).toBeTruthy()
    const refreshCookie = Array.isArray(setCookie)
      ? setCookie.find((c) => c.startsWith('refresh-token='))
      : setCookie
    expect(refreshCookie).toMatch(/refresh-token=/)
  })

  it('returns 401 for wrong password', async () => {
    const email = 'login.wrongpass@example.com'
    await registerUser(email, 'Str0ng!Pass')

    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'BadPass!1' })

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({
      error: {
        type: 'InvalidCredentials',
        code: 401,
        message: expect.any(String),
      },
    })
  })

  it('returns 401 for non-existent email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'no.such.user@example.com', password: 'SomePass!1' })

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({
      error: {
        type: 'InvalidCredentials',
        code: 401,
        message: expect.any(String),
      },
    })
  })

  it('reuses existing session when refresh token cookie is presented (idempotent login)', async () => {
    const email = 'login.reuse@example.com'
    const password = 'Str0ng!Pass'
    await registerUser(email, password)

    // Perform initial login to set cookie
    const first = await request(app).post('/api/v1/auth/login').send({ email, password })
    expect(first.status).toBe(200)
    const cookieHeader = first.headers['set-cookie']
    expect(cookieHeader).toBeTruthy()
    const refreshCookie = Array.isArray(cookieHeader)
      ? cookieHeader.find((c) => c.startsWith('refresh-token='))
      : cookieHeader
    expect(refreshCookie).toBeTruthy()

    // Second login sends refresh cookie to simulate reuse path
    const second = await request(app)
      .post('/api/v1/auth/login')
      .set('Cookie', refreshCookie as string)
      .send({ email, password })

    expect(second.status).toBe(200)
    expect(second.body).toEqual({ accessToken: expect.stringMatching(/^ey/) })
    // Ensure we still have a refresh-token cookie (may be same or rotated depending on reuse path logic)
    const secondCookieHeader = second.headers['set-cookie']
    expect(secondCookieHeader).toBeTruthy()
    expect(cookieHeader).toEqual(secondCookieHeader)
  })
})
