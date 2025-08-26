import type { Pool } from 'pg'

import { PgClient } from '@infrastructure/clients/pg-client.js'
import { EntityAlreadyExistsError } from '@infrastructure/errors/repository.error.js'

describe('PgClient', () => {
  let pool: { query: jest.Mock }
  let client: PgClient

  beforeEach(() => {
    pool = { query: jest.fn() }
    client = new PgClient(pool as unknown as jest.Mocked<Pool>)
  })

  describe('findOne', () => {
    it('returns first row when present', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'row' }],
      })
      const result = await client.findOne<{ id: number; name: string }>(
        'SELECT 1',
      )
      expect(result).toEqual({ id: 1, name: 'row' })
      expect(pool.query).toHaveBeenCalledWith('SELECT 1', undefined)
    })

    it('returns null when no rows', async () => {
      pool.query.mockResolvedValue({ rows: [] })
      const result = await client.findOne<{ id: number }>('SELECT 1')
      expect(result).toBeNull()
    })
  })

  describe('insertOrThrow', () => {
    it('resolves when rowCount > 0', async () => {
      pool.query.mockResolvedValue({ rowCount: 1 })
      await expect(
        client.insertOrThrow('INSERT', ['a']),
      ).resolves.toBeUndefined()
    })

    it('throws EntityAlreadyExistsError when rowCount is 0', async () => {
      pool.query.mockResolvedValue({ rowCount: 0 })
      await expect(
        client.insertOrThrow('INSERT', ['a']),
      ).rejects.toBeInstanceOf(EntityAlreadyExistsError)
    })

    it('throws EntityAlreadyExistsError on unique violation code', async () => {
      const error = Object.assign(new Error('duplicate'), { code: '23505' })
      pool.query.mockRejectedValue(error)
      await expect(
        client.insertOrThrow('INSERT', ['a']),
      ).rejects.toBeInstanceOf(EntityAlreadyExistsError)
    })

    it('re-throws unknown errors', async () => {
      const error = new Error('db down')
      pool.query.mockRejectedValue(error)
      await expect(client.insertOrThrow('INSERT', ['a'])).rejects.toBe(error)
    })
  })

  describe('query', () => {
    it('delegates to pool.query', async () => {
      const resultObj = { rows: [{ v: 1 }] }
      pool.query.mockResolvedValue(resultObj)
      const res = await client.query('SELECT $1', [1])
      expect(res).toBe(resultObj)
      expect(pool.query).toHaveBeenCalledWith('SELECT $1', [1])
    })
  })
})
