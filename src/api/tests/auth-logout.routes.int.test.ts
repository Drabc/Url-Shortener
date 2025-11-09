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
import { POSTGRES_CLIENT } from '@infrastructure/constants.js'
import { PgClient } from '@infrastructure/clients/pg-client.js'
import { clock } from '@application/shared/clock.js'

/**
 * Integration tests for POST /api/v1/auth/logout endpoint.
 */
describe('POST /api/v1/auth/logout', () => {
  let connections: PersistenceConnections
  let app: Express
  let pg: PgClient

  beforeAll(async () => {
    connections = await createPersistenceConnections(config, logger, {
      pg: createPgClientOverwrite,
    })
    const deps = await createDeps(config, connections, clock, logger)
    pg = connections.get(POSTGRES_CLIENT)
    app = createHttpApp(deps)
  })

  afterAll(async () => connections.disconnectAll())

  beforeEach(async () => await pg.query('BEGIN'))
  afterEach(async () => await pg.query('ROLLBACK'))

  /**
   * Registers a user then logs them in returning credentials.
   * @param {string} email User email address
   * @param {string} password Plain password string
   * @returns {Promise<{ accessToken: string; refreshCookie: string }>} Access token and refresh cookie
   */
  async function registerAndLogin(email: string, password: string) {
    await request(app).post('/api/v1/auth/register').send({
      id: undefined,
      firstName: 'Log',
      lastName: 'Out',
      email,
      password,
    })
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password })
    expect(loginRes.status).toBe(200)
    const accessToken = loginRes.body.accessToken
    const cookieHeader = loginRes.headers['set-cookie']
    const refreshCookie = Array.isArray(cookieHeader)
      ? cookieHeader.find((c) => c.startsWith('refresh-token='))
      : cookieHeader
    return { accessToken, refreshCookie: refreshCookie }
  }

  it('logs out successfully clearing refresh cookie', async () => {
    const email = 'logout.success@example.com'
    const password = 'Str0ng!Pass'
    const { accessToken, refreshCookie } = await registerAndLogin(email, password)

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', refreshCookie)

    const dbResult = await pg.findMany(
      `
        SELECT s.status AS s_status, rt.status AS rt_status, s.end_reason
        FROM app.users u
        JOIN auth.sessions s on s.user_id = u.id
        JOIN auth.refresh_tokens rt on rt.session_id = s.id
        WHERE u.email = $1
      `,
      [email],
    )

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ message: 'Logged out successfully' })
    // Expect cookie cleared (Set-Cookie with empty value)
    const setCookie = res.headers['set-cookie']
    expect(setCookie).toBeTruthy()
    const cleared = Array.isArray(setCookie)
      ? setCookie.find((c) => c.startsWith('refresh-token='))
      : setCookie
    expect(cleared).toMatch(/refresh-token=;/)
    // DB checks
    expect(dbResult.length).toBeGreaterThan(0)
    expect(dbResult[0].end_reason).not.toBeFalsy()
    expect(dbResult[0].s_status).toBe('revoked')
    expect(dbResult[0].rt_status).toBe('revoked')
  })

  it('returns 401 when Authorization header missing', async () => {
    const res = await request(app).post('/api/v1/auth/logout')
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({
      error: {
        type: expect.any(String),
        code: 401,
        message: expect.any(String),
      },
    })
  })

  it('returns 401 when token is malformed/invalid', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', 'Bearer invalid.token.value')
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({
      error: {
        type: expect.any(String),
        code: 401,
        message: expect.any(String),
      },
    })
  })
})
