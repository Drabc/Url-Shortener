import type { Pool, PoolClient } from 'pg'

import { PgClient } from '@infrastructure/clients/pg-client.js'
import {
  PgTransactionBeginError,
  PgTransactionCommitError,
} from '@infrastructure/errors/pg-client.error.js'

type Failure<T> = Exclude<T, { ok: true }>

describe('PgClient', () => {
  let pool: { query: jest.Mock; connect: jest.Mock }
  let client: PgClient

  beforeEach(() => {
    pool = { query: jest.fn(), connect: jest.fn() }
    client = new PgClient(pool as unknown as jest.Mocked<Pool>)
  })

  describe('findOne', () => {
    it('returns first row when present', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'row' }],
      })
      const result = await client.findOne<{ id: number; name: string }>('SELECT 1')
      expect(result).toEqual({ id: 1, name: 'row' })
      expect(pool.query).toHaveBeenCalledWith('SELECT 1', undefined)
    })

    it('returns null when no rows', async () => {
      pool.query.mockResolvedValue({ rows: [] })
      const result = await client.findOne<{ id: number }>('SELECT 1')
      expect(result).toBeNull()
    })
  })

  describe('insert', () => {
    it('returns Ok when rowCount > 0', async () => {
      pool.query.mockResolvedValue({ rowCount: 1 })
      const res = await client.insert('INSERT', ['a'])
      expect(res.ok).toBe(true)
    })

    it('returns infra UniqueViolation when rowCount is 0', async () => {
      pool.query.mockResolvedValue({ rowCount: 0 })
      const res = await client.insert('INSERT', ['a'])
      expect(res.ok).toBe(false)
      const failure = res as Failure<typeof res>
      expect(failure.error.kind).toBe('infra')
      expect(failure.error.type).toBe('UniqueViolation')
    })

    it('returns infra UniqueViolation on unique violation code', async () => {
      const error = Object.assign(new Error('duplicate'), { code: '23505' })
      pool.query.mockRejectedValue(error)
      const res = await client.insert('INSERT', ['a'])
      expect(res.ok).toBe(false)
      const failure = res as Failure<typeof res>
      expect(failure.error.kind).toBe('infra')
      expect(failure.error.type).toBe('UniqueViolation')
    })

    it('returns UnableToInsert on other errors', async () => {
      const error = new Error('db down')
      pool.query.mockRejectedValue(error)
      const res = await client.insert('INSERT', ['a'])
      expect(res.ok).toBe(false)
      const failure = res as Failure<typeof res>
      expect(failure.error.kind).toBe('infra')
      expect(failure.error.type).toBe('UnableToInsert')
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

  describe('transactions', () => {
    let mockPgClient: { query: jest.Mock; release: jest.Mock }

    beforeEach(() => {
      mockPgClient = { query: jest.fn(), release: jest.fn() }
      pool.connect.mockResolvedValue(mockPgClient as unknown as PoolClient)
    })

    it('begin returns a unit of work with query/commit/rollback', async () => {
      mockPgClient.query.mockResolvedValueOnce({})
      const uow = await client.begin()
      expect(typeof uow.query).toBe('function')
      expect(typeof uow.commit).toBe('function')
      expect(typeof uow.rollback).toBe('function')
    })

    it('commit issues COMMIT and releases client', async () => {
      mockPgClient.query.mockResolvedValue({})
      const uow = await client.begin()
      await uow.commit()
      expect(mockPgClient.query).toHaveBeenCalledWith('COMMIT')
      expect(mockPgClient.release).toHaveBeenCalled()
    })

    it('rollback issues ROLLBACK and releases client', async () => {
      mockPgClient.query.mockResolvedValue({})
      const uow = await client.begin()
      await uow.rollback()
      expect(mockPgClient.query).toHaveBeenCalledWith('ROLLBACK')
      expect(mockPgClient.release).toHaveBeenCalled()
    })

    it('query inside transaction delegates to underlying client', async () => {
      const resultObj = { rows: [{ inside: true }] }
      mockPgClient.query.mockResolvedValue(resultObj)
      const uow = await client.begin()
      const res = await uow.query<{ inside: boolean }>('SELECT 1')
      expect(res.rows).toEqual(resultObj.rows)
      expect(mockPgClient.query).toHaveBeenCalledWith('SELECT 1', undefined)
    })

    it('commit is idempotent after first call (subsequent calls do nothing)', async () => {
      mockPgClient.query.mockResolvedValue({})
      const uow = await client.begin()
      await uow.commit()
      const callsAfterCommit = mockPgClient.query.mock.calls.length
      await uow.commit() // second commit should be no-op
      expect(mockPgClient.query.mock.calls.length).toBe(callsAfterCommit)
    })

    it('rollback is idempotent after commit (does nothing)', async () => {
      mockPgClient.query.mockResolvedValue({})
      const uow = await client.begin()
      await uow.commit()
      const callsAfterCommit = mockPgClient.query.mock.calls.length
      await uow.rollback()
      expect(mockPgClient.query.mock.calls.length).toBe(callsAfterCommit)
    })

    it('throws PgTransactionBeginError when BEGIN fails', async () => {
      mockPgClient.query.mockRejectedValue(new Error('boom'))
      const originalConnect = pool.connect
      originalConnect.mockResolvedValue(mockPgClient as unknown as PoolClient)
      await expect(client.begin()).rejects.toBeInstanceOf(PgTransactionBeginError)
      expect(mockPgClient.release).toHaveBeenCalled()
    })

    it('throws PgTransactionCommitError when COMMIT fails', async () => {
      // BEGIN succeeds first
      mockPgClient.query.mockResolvedValueOnce({})
      const uow = await client.begin()
      // COMMIT fails
      mockPgClient.query.mockRejectedValueOnce(new Error('commit fail'))
      await expect(uow.commit()).rejects.toBeInstanceOf(PgTransactionCommitError)
      expect(mockPgClient.release).toHaveBeenCalled()
    })
  })
})
