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
 * Integration tests for POST /api/v1/auth/register endpoint.
 */
describe('POST /api/v1/auth/register', () => {
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

  afterAll(async () => await connections.disconnectAll())

  beforeEach(async () => client.query('BEGIN'))
  afterEach(async () => client.query('ROLLBACK'))

  it('registers a new user and returns 201', async () => {
    const email = 'jane.doe.unique@example.com'
    const res = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Jane',
      lastName: 'Doe',
      email,
      password: 'Str0ng!Pass',
    })

    const user = await client.findOne('SELECT * FROM app.users WHERE email = $1', [email])

    expect(user?.email).toBe(email)
    expect(res.status).toBe(201)
    // Body is empty per controller respond usage
    expect(res.body).toEqual({})
  })

  it('returns conflict when user already exists', async () => {
    const body = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith.dup@example.com',
      password: 'An0ther!Pass',
    }
    // Create first
    const first = await request(app).post('/api/v1/auth/register').send(body)
    expect(first.status).toBe(201)

    // Attempt duplicate
    const duplicate = await request(app).post('/api/v1/auth/register').send(body)
    expect(duplicate.status).toBe(409)
    expect(duplicate.body).toMatchObject({
      error: {
        type: 'DuplicateUser',
        code: 409,
        message: expect.any(String),
      },
    })
  })

  it('returns validation error for invalid email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Bad',
      lastName: 'Email',
      email: 'not-an-email',
      password: 'GoodPass!123',
    })

    expect(res.status).toBe(422)
    expect(res.body).toMatchObject({
      error: {
        type: 'VALIDATION',
        code: 422,
        message: expect.any(String),
      },
    })
  })

  it('returns validation error for weak password', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Weak',
      lastName: 'Password',
      email: 'weak.pass@example.com',
      password: 'abc',
    })

    expect(res.status).toBe(422)
    expect(res.body).toMatchObject({
      error: {
        type: 'InvalidPassword',
        code: 422,
        message: expect.any(String),
      },
    })
  })
})
