import {
  PostgresUserRepository,
  UserRow,
} from '@infrastructure/repositories/user/postgres-user.repository.js'
import { PgClient } from '@infrastructure/clients/pg-client.js'
import { User } from '@domain/entities/user.js'
import { Err } from '@shared/result.js'

describe('PostgresUserRepository', () => {
  let pg: { findOne: jest.Mock; insert: jest.Mock }
  let repo: PostgresUserRepository

  type Success<T> = Extract<T, { ok: true }>
  type Failure<T> = Extract<T, { ok: false }>

  beforeEach(() => {
    pg = { findOne: jest.fn(), insert: jest.fn() }
    repo = new PostgresUserRepository(pg as unknown as PgClient)
  })

  describe('findById()', () => {
    it('returns Ok(null) when no row found', async () => {
      pg.findOne.mockResolvedValue(null)
      const res = await repo.findById('uuid')
      const okRes: Success<typeof res> = res as Success<typeof res>
      expect(okRes.ok).toBe(true)
      expect(okRes.value).toBeNull()
      expect(pg.findOne).toHaveBeenCalledWith('select * from app.users u where u.id = $1', ['uuid'])
    })

    it('maps row to User entity inside Ok', async () => {
      const row: UserRow = {
        id: '11111111-1111-1111-1111-111111111111',
        first_name: 'First',
        last_name: 'Last',
        email: 'user@example.com',
        password_hash: 'hash',
        password_updated_at: '2025-01-02T00:00:00.000Z',
      }
      pg.findOne.mockResolvedValue(row)

      const res = await repo.findById(row.id)
      const okRes: Success<typeof res> = res as Success<typeof res>
      expect(okRes.ok).toBe(true)
      expect(okRes.value).toBeInstanceOf(User)
      const user = okRes.value as User
      expect(user.id).toBe(row.id)
      expect(user.firstName).toBe('First')
      expect(user.lastName).toBe('Last')
      expect(user.email.value).toBe('user@example.com')
      expect(user.passwordHash).toBe('hash')
      expect(user.passwordUpdatedAt.toISOString()).toBe('2025-01-02T00:00:00.000Z')
    })
  })

  describe('findByEmail()', () => {
    it('returns Ok(null) when no row found', async () => {
      pg.findOne.mockResolvedValue(null)
      const res = await repo.findByEmail('user@example.com')
      const okRes: Success<typeof res> = res as Success<typeof res>
      expect(okRes.ok).toBe(true)
      expect(okRes.value).toBeNull()
      expect(pg.findOne).toHaveBeenCalledWith('select * from app.users u where u.email = $1', [
        'user@example.com',
      ])
    })

    it('maps row to User entity inside Ok', async () => {
      const row: UserRow = {
        id: '22222222-2222-2222-2222-222222222222',
        first_name: 'First2',
        last_name: 'Last2',
        email: 'second@example.com',
        password_hash: 'hash2',
        password_updated_at: '2025-01-03T00:00:00.000Z',
      }
      pg.findOne.mockResolvedValue(row)

      const res = await repo.findByEmail(row.email)
      const okRes: Success<typeof res> = res as Success<typeof res>
      expect(okRes.ok).toBe(true)
      expect(okRes.value).toBeInstanceOf(User)
      const user = okRes.value as User
      expect(user.id).toBe(row.id)
      expect(user.firstName).toBe(row.first_name)
      expect(user.lastName).toBe(row.last_name)
      expect(user.email.value).toBe(row.email)
      expect(user.passwordHash).toBe(row.password_hash)
      expect(user.passwordUpdatedAt.toISOString()).toBe(row.password_updated_at)
    })
  })

  describe('save()', () => {
    it('delegates to insert with expected values and returns Ok', async () => {
      pg.insert.mockResolvedValue({ ok: true, value: undefined })
      const userRes = User.create(
        'id-1',
        'First',
        'Last',
        'user@example.com',
        'hash',
        new Date('2025-01-02T00:00:00.000Z'),
      )
      if (!userRes.ok) throw new Error('User.create unexpectedly failed in test setup')
      const res = await repo.save(userRes.value)
      const okRes: Success<typeof res> = res as Success<typeof res>
      expect(okRes.ok).toBe(true)
      expect(pg.insert).toHaveBeenCalledTimes(1)
      const [query, values] = pg.insert.mock.calls[0]
      expect(query).toContain('insert into app.users')
      expect(values).toEqual([
        'First',
        'Last',
        'user@example.com',
        'hash',
        new Date('2025-01-02T00:00:00.000Z'),
      ])
    })

    it('returns Err when underlying insert fails', async () => {
      // Simulate underlying client error shape that repository maps
      pg.insert.mockResolvedValue(
        Err({ kind: 'domain', type: 'UnableToSave', category: 'unknown', message: 'db error' }),
      )
      const userRes = User.create(
        'id-2',
        'First',
        'Last',
        'user2@example.com',
        'hash2',
        new Date('2025-01-03T00:00:00.000Z'),
      )
      if (!userRes.ok) throw new Error('User.create unexpectedly failed in test setup')
      const res = await repo.save(userRes.value)
      const errRes: Failure<typeof res> = res as Failure<typeof res>
      expect(errRes.ok).toBe(false)
      expect(errRes.error.type).toBe('UnableToSave')
      expect(errRes.error.category).toBe('unknown')
    })
  })
})
