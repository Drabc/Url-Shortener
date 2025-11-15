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
import { POSTGRES_CLIENT, RATE_LIMIT_CLIENT } from '@infrastructure/constants.js'
import { PgClient } from '@infrastructure/clients/pg-client.js'

/**
 * Integration tests covering rate limit middleware behavior across anonymous and authenticated routes.
 * Scenarios:
 *  - Anonymous URL creation decrements remaining and enforces limit (createUrlAnon policy: 5/hr)
 *  - Authenticated URL creation uses separate counter (createUrlAuth policy) unaffected by anonymous usage
 *  - General auth policy differs from general anonymous (1000 vs 100) when hitting authenticated endpoint
 *  - Distinct counters (general vs createUrl) don't interfere
 */
describe('Rate Limit Middleware', () => {
  let connections: PersistenceConnections
  let app: Express
  let pg: PgClient
  let rateRedis: Redis

  // Maintain shared connections for performance, but recreate the rate limiter/middlewares each test
  beforeAll(async () => {
    connections = await createPersistenceConnections(config, logger, {
      pg: createPgClientOverwrite,
    })
    pg = connections.get(POSTGRES_CLIENT)
    rateRedis = connections.get(RATE_LIMIT_CLIENT)
  })

  afterAll(async () => connections.disconnectAll())

  beforeEach(async () => {
    await pg.query('BEGIN')
    // Flush Redis so no previous counters persist (rate-limiter-flexible keeps in-memory insurance, so recreate deps)
    await rateRedis.flushdb()
    const deps = await createDeps(config, connections, clock, logger)
    app = createHttpApp(deps)
  })
  afterEach(async () => {
    await pg.query('ROLLBACK')
    // Extra flush to ensure complete isolation even if a test aborts mid-run
    await rateRedis.flushdb()
  })

  const makeUrl = (i: number) => `https://example.com/path/${i}`

  it('enforces anonymous create URL limit (5 requests then block)', async () => {
    const successes: number[] = []
    const baseIp = '192.0.2.10' // TEST-NET-1 address for isolation
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/v1/shorten')
        .set('X-Forwarded-For', baseIp) // ensure same key per loop
        .send({ url: makeUrl(i) })
      expect(res.status).toBe(201)
      const remaining = Number(res.headers['x-ratelimit-remaining'])
      successes.push(remaining)
    }
    expect(successes[0]).toBeGreaterThan(successes[4])
    expect(successes[4]).toBe(0)

    const blocked = await request(app)
      .post('/api/v1/shorten')
      .set('X-Forwarded-For', baseIp)
      .send({ url: makeUrl(99) })

    expect(blocked.status).toBe(429)
    expect(blocked.body).toMatchObject({
      error: {
        code: blocked.status,
        message: expect.any(String),
        type: expect.any(String),
      },
    })
  })

  it('uses separate authenticated counter for create URL policy', async () => {
    const anonIp = '192.0.2.20'
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/v1/shorten')
        .set('X-Forwarded-For', anonIp)
        .send({ url: makeUrl(i) })
    }

    const email = 'rate.auth@example.com'
    const password = 'Str0ng!Pass'
    const registerRes = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Rate',
      lastName: 'Limit',
      email,
      password,
    })
    expect(registerRes.status).toBe(201)
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password })
    expect(loginRes.status).toBe(200)
    const accessToken = loginRes.body.accessToken as string

    const authShorten = await request(app)
      .post('/api/v1/me/shorten')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: makeUrl(500) })
    expect(authShorten.status).toBe(201)
    const remaining = Number(authShorten.headers['x-ratelimit-remaining'])
    expect(remaining).toBeGreaterThan(10)
  })

  it('general auth policy differs from general anonymous policy selection', async () => {
    const anonIp = '192.0.2.30'
    const preLogin = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', anonIp)
      .send({ email: 'none@example.com', password: 'WrongPass!1' })
    const preHeader = preLogin.headers['x-ratelimit-remaining']
    expect(preHeader).toBeDefined()

    const email = 'rate.switch@example.com'
    const password = 'Str0ng!Pass'
    await request(app).post('/api/v1/auth/register').send({
      firstName: 'Rate',
      lastName: 'Switch',
      email,
      password,
    })
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password })
    expect(loginRes.status).toBe(200)
    const accessToken = loginRes.body.accessToken as string
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(logoutRes.status).toBe(200)
    const postHeader = logoutRes.headers['x-ratelimit-remaining']
    expect(postHeader).toBeDefined()
    expect(Number(postHeader)).toBeGreaterThan(Number(preHeader))
  })
})
