import type {
  Db,
  Collection,
  Document,
  InsertOneResult,
  UpdateResult,
  WithId,
} from 'mongodb'

import { MongoMigrationPlan } from '@infrastructure/db/migrations/plans/mongo-migration-plan.js'
import { Migration } from '@infrastructure/db/migrations/types.js'
import {
  MigrationCommitError,
  MigrationLockAcquisitionError,
  MigrationLockNotAcquiredError,
  MigrationLockRenewalError,
  MigrationLockReleaseError,
} from '@infrastructure/errors/migration.error.js'

describe('MongoMigrationPlan', () => {
  let ctx: jest.Mocked<Db>
  let locksCollection: jest.Mocked<Collection<Document>>
  let migrationsCollection: jest.Mocked<Collection<Document>>
  let plan: MongoMigrationPlan
  let mig: Migration<Db>

  beforeEach(() => {
    locksCollection = {
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn(),
    } as unknown as jest.Mocked<Collection<Document>>

    migrationsCollection = {
      insertOne: jest.fn(),
    } as unknown as jest.Mocked<Collection<Document>>

    ctx = {
      collection: jest.fn((name: string) => {
        if (name === 'migration_locks') return locksCollection
        if (name === 'migrations') return migrationsCollection
        throw new Error('unexpected collection: ' + name)
      }),
    } as unknown as jest.Mocked<Db>

    plan = new MongoMigrationPlan([], ctx)
    mig = {
      id: '0001-test',
      up: jest.fn().mockResolvedValue(undefined),
    } as unknown as Migration<Db>
  })

  it('displayName returns the expected label', () => {
    expect(plan.displayName).toBe('MongoDB Migration Plan')
  })

  describe('commitMigration()', () => {
    it('inserts a migration doc', async () => {
      migrationsCollection.insertOne.mockResolvedValue({
        acknowledged: true,
      } as InsertOneResult<Document>)

      await expect(plan.commitMigration(mig)).resolves.toBeUndefined()
      expect(migrationsCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: '0001-test', ran_on: expect.any(Date) }),
      )
    })

    it('throws MigrationCommitError when not acknowledged', async () => {
      migrationsCollection.insertOne.mockResolvedValue({
        acknowledged: false,
      } as InsertOneResult<Document>)

      await expect(plan.commitMigration(mig)).rejects.toBeInstanceOf(
        MigrationCommitError,
      )
    })
  })

  describe('acquireLock()', () => {
    it('acquires the lock and sets internal state', async () => {
      locksCollection.findOneAndUpdate.mockResolvedValue({} as WithId<Document>)

      await expect(plan.acquireLock()).resolves.toBeUndefined()
      expect(locksCollection.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'mongo' }),
        expect.objectContaining({
          $set: expect.objectContaining({
            acquiredAt: expect.any(Date),
            expiresAt: expect.any(Date),
          }),
        }),
        expect.objectContaining({
          upsert: true,
          returnDocument: 'after',
          writeConcern: { w: 'majority' },
        }),
      )
    })

    it('throws MigrationLockAcquisitionError when underlying call fails', async () => {
      locksCollection.findOneAndUpdate.mockRejectedValue(
        new Error('db error'),
      )

      await expect(plan.acquireLock()).rejects.toBeInstanceOf(
        MigrationLockAcquisitionError,
      )
    })
  })

  describe('renewLock()', () => {
    it('throws when called without acquiring a lock', async () => {
      await expect(plan.renewLock()).rejects.toBeInstanceOf(
        MigrationLockNotAcquiredError,
      )
    })

    it('renews the lock when acknowledged', async () => {
      locksCollection.findOneAndUpdate.mockResolvedValue({} as WithId<Document>)
      await plan.acquireLock()
      locksCollection.updateOne.mockResolvedValue({
        acknowledged: true,
      } as UpdateResult)

      await expect(plan.renewLock()).resolves.toBeUndefined()
      expect(locksCollection.updateOne).toHaveBeenCalledWith(
        { _id: 'mongo' },
        expect.objectContaining({
          $set: expect.objectContaining({ expiresAt: expect.any(Date) }),
        }),
        { writeConcern: { w: 'majority' } },
      )
    })

    it('throws MigrationLockRenewalError when not acknowledged', async () => {
      locksCollection.findOneAndUpdate.mockResolvedValue({} as WithId<Document>)
      await plan.acquireLock()
      locksCollection.updateOne.mockResolvedValue({
        acknowledged: false,
      } as UpdateResult)

      await expect(plan.renewLock()).rejects.toBeInstanceOf(
        MigrationLockRenewalError,
      )
    })
  })

  describe('releaseLock()', () => {
    it('sets expiresAt to epoch when acknowledged', async () => {
      locksCollection.updateOne.mockResolvedValue({
        acknowledged: true,
      } as UpdateResult)

      await expect(plan.releaseLock()).resolves.toBeUndefined()
      expect(locksCollection.updateOne).toHaveBeenCalledWith(
        { _id: 'mongo' },
        { $set: { expiresAt: new Date(0) } },
        { writeConcern: { w: 'majority' } },
      )
    })

    it('throws MigrationLockReleaseError when not acknowledged', async () => {
      locksCollection.updateOne.mockResolvedValue({
        acknowledged: false,
      } as UpdateResult)

      await expect(plan.releaseLock()).rejects.toBeInstanceOf(
        MigrationLockReleaseError,
      )
    })
  })
})
