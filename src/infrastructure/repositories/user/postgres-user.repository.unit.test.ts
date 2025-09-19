import {
  PostgresUserRepository,
  UserRow,
} from '@infrastructure/repositories/user/postgres-user.repository.js'
import { PgClient } from '@infrastructure/clients/pg-client.js'
import { User } from '@domain/entities/user.js'
import { Email } from '@domain/value-objects/email.js'

describe('PostgresUserRepository', () => {
  let pg: { findOne: jest.Mock; insertOrThrow: jest.Mock }
  let repo: PostgresUserRepository

  beforeEach(() => {
    pg = { findOne: jest.fn(), insertOrThrow: jest.fn() }
    repo = new PostgresUserRepository(pg as unknown as PgClient)
  })

  describe('findById()', () => {
    it('returns null when no row found', async () => {
      pg.findOne.mockResolvedValue(null)
      const result = await repo.findById('uuid')
      expect(result).toBeNull()
      expect(pg.findOne).toHaveBeenCalledWith('select * from app.users u where u.id = $1', ['uuid'])
    })

    it('maps row to User entity', async () => {
      const row: UserRow = {
        id: '11111111-1111-1111-1111-111111111111',
        first_name: 'First',
        last_name: 'Last',
        email: 'user@example.com',
        password_hash: 'hash',
        password_updated_at: '2025-01-02T00:00:00.000Z',
      }
      pg.findOne.mockResolvedValue(row)

      const result = await repo.findById(row.id)
      expect(result).toBeInstanceOf(User)
      expect(result?.id).toBe(row.id)
      expect(result?.firstName).toBe('First')
      expect(result?.lastName).toBe('Last')
      expect(result?.email.value).toBe('user@example.com')
      expect(result?.passwordHash).toBe('hash')
      expect(result?.passwordUpdatedAt.toISOString()).toBe('2025-01-02T00:00:00.000Z')
    })
  })

  describe('findByEmail()', () => {
    it('returns null when no row found', async () => {
      pg.findOne.mockResolvedValue(null)
      const result = await repo.findByEmail('user@example.com')
      expect(result).toBeNull()
      expect(pg.findOne).toHaveBeenCalledWith('select * from app.users u where u.email = $1', [
        'user@example.com',
      ])
    })

    it('maps row to User entity when found', async () => {
      const row: UserRow = {
        id: '22222222-2222-2222-2222-222222222222',
        first_name: 'First2',
        last_name: 'Last2',
        email: 'second@example.com',
        password_hash: 'hash2',
        password_updated_at: '2025-01-03T00:00:00.000Z',
      }
      pg.findOne.mockResolvedValue(row)

      const result = await repo.findByEmail(row.email)
      expect(result).toBeInstanceOf(User)
      expect(result?.id).toBe(row.id)
      expect(result?.firstName).toBe(row.first_name)
      expect(result?.lastName).toBe(row.last_name)
      expect(result?.email.value).toBe(row.email)
      expect(result?.passwordHash).toBe(row.password_hash)
      expect(result?.passwordUpdatedAt.toISOString()).toBe(row.password_updated_at)
    })
  })

  describe('save()', () => {
    it('delegates to insertOrThrow with expected values', async () => {
      pg.insertOrThrow.mockResolvedValue(undefined)
      const user = new User(
        'id-1',
        'First',
        'Last',
        Email.create('user@example.com'),
        'hash',
        new Date('2025-01-02T00:00:00.000Z'),
      )

      await expect(repo.save(user)).resolves.toBeUndefined()

      expect(pg.insertOrThrow).toHaveBeenCalledTimes(1)
      const [query, values] = pg.insertOrThrow.mock.calls[0]
      expect(query).toContain('insert into app.users')
      expect(values).toEqual([
        'First',
        'Last',
        'user@example.com',
        'hash',
        new Date('2025-01-02T00:00:00.000Z'),
      ])
    })
  })
})
