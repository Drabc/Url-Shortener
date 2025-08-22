import type { Pool } from 'pg'

import { PostgresMigrationPlan } from '@infrastructure/db/migrations/plans/postgres-migration-plan.js'
import { Migration } from '@infrastructure/db/migrations/types.js'
import {
  MigrationCommitError,
  MigrationLockAcquisitionError,
  MigrationLockReleaseError,
} from '@infrastructure/errors/migration.error.js'

describe('PostgresMigrationPlan', () => {
  let pool: { query: jest.Mock }
  let plan: PostgresMigrationPlan
  let migration: jest.Mocked<Migration<Pool>>

  beforeEach(() => {
    pool = { query: jest.fn() }
    plan = new PostgresMigrationPlan([], pool as unknown as Pool)
    migration = {
      id: '0001-create-urls',
      up: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Migration<Pool>>
  })

  describe('displayName', () => {
    it('has the correct display name', () => {
      expect(plan.displayName).toBe('Postgres Migration Plan')
    })
  })

  describe('commitMigration()', () => {
    it('commits when one row is inserted', async () => {
      pool.query.mockResolvedValue({ rowCount: 1 })
      await expect(plan.commitMigration(migration)).resolves.toBeUndefined()
      expect(pool.query).toHaveBeenCalledTimes(1)
    })

    it('throws MigrationCommitError when no row is affected', async () => {
      pool.query.mockResolvedValue({ rowCount: 0 })
      await expect(plan.commitMigration(migration)).rejects.toBeInstanceOf(
        MigrationCommitError,
      )
    })
  })

  describe('acquireLock()', () => {
    it('acquires the lock when insert/update affects one row', async () => {
      pool.query.mockResolvedValue({ rowCount: 1 })
      await expect(plan.acquireLock()).resolves.toBeUndefined()
      expect(pool.query).toHaveBeenCalledTimes(1)
    })

    it('throws MigrationLockAcquisitionError when no row is affected', async () => {
      pool.query.mockResolvedValue({ rowCount: 0 })
      await expect(plan.acquireLock()).rejects.toBeInstanceOf(
        MigrationLockAcquisitionError,
      )
    })

    it('throws MigrationLockAcquisitionError when the query fails', async () => {
      pool.query.mockRejectedValue(new Error('db boom'))
      await expect(plan.acquireLock()).rejects.toBeInstanceOf(
        MigrationLockAcquisitionError,
      )
    })
  })

  describe('releaseLock()', () => {
    it('is a no-op if the lock was not acquired', async () => {
      await expect(plan.releaseLock()).resolves.toBeUndefined()
      expect(pool.query).not.toHaveBeenCalled()
    })

    it('releases the lock by updating the lock expiration time', async () => {
      // acquire success
      pool.query.mockResolvedValueOnce({ rowCount: 1 })
      await plan.acquireLock()

      // delete success
      pool.query.mockResolvedValueOnce({ rowCount: 1 })
      await expect(plan.releaseLock()).resolves.toBeUndefined()

      expect(pool.query).toHaveBeenCalledTimes(2)
    })

    it('throws MigrationLockReleaseError when a lock was acquired, but failed to update the expiration time', async () => {
      // acquire success
      pool.query.mockResolvedValueOnce({ rowCount: 1 })
      await plan.acquireLock()

      // delete no-op
      pool.query.mockResolvedValueOnce({ rowCount: 0 })
      await expect(plan.releaseLock()).rejects.toBeInstanceOf(
        MigrationLockReleaseError,
      )
    })
  })
})
