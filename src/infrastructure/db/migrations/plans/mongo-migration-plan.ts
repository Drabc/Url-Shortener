import { Db, Collection } from 'mongodb'

import { Migration, MigrationPlan } from '@infrastructure/db/migrations/types.js'
import {
  MigrationCommitError,
  MigrationLockAcquisitionError,
  MigrationLockRenewalError,
  MigrationLockReleaseError,
  MigrationLockNotAcquiredError,
} from '@infrastructure/errors/migration.error.js'

type LockDoc = {
  _id: string
  holder: string
  acquiredAt: Date
  expiresAt: Date
}

type MigrationDoc = {
  _id: string
  ran_on: Date
}

/**
 * Mongo-specific migration plan providing a lease lock using a
 * `migration_locks` collection.
 */
export class MongoMigrationPlan extends MigrationPlan<Db> {
  private static readonly LOCK_KEY = 'mongo'
  // Todo: Create a small lock class when other plans are added
  private static readonly DEFAULT_LEASE_MS = 10 * 60_000

  private lockAcquired: boolean = false

  /**
   * Returns the display name for the migration plan.
   * @returns {string} The display name
   */
  public get displayName(): string {
    return 'MongoDB Migration Plan'
  }

  /**
   * Returns the `migration_locks` collection typed to `LockDoc`.
   * @returns {Collection<LockDoc>} The locks collection
   */
  private get locksCollection(): Collection<LockDoc> {
    return this.ctx.collection<LockDoc>('migration_locks')
  }

  /**
   * Returns the `migrations` collection
   * @returns {Collection<MigrationDoc>} the migrations collection
   */
  private get migrationCollection(): Collection<MigrationDoc> {
    return this.ctx.collection('migrations')
  }

  /**
   * Adds a migration to the migrations collection
   * @param {Migration<Db>} migration the migration to commit
   */
  public async commitMigration(migration: Migration<Db>): Promise<void> {
    const result = await this.migrationCollection.insertOne({
      _id: migration.id,
      ran_on: new Date(),
    })

    if (!result.acknowledged) throw new MigrationCommitError(migration.id)
  }

  /**
   * Acquires a lease lock in the `migration_locks` collection.
   * Uses a simple expiry-based lock to prevent concurrent runners.
   * - Upsert a document with `_id: 'mongo'` and an `expiresAt` in the future
   * - Only succeeds if the lock is expired or not present
   */
  public async acquireLock(): Promise<void> {
    const { now, expiresAt } = this.getLockTimes()

    try {
      await this.locksCollection.findOneAndUpdate(
        {
          _id: MongoMigrationPlan.LOCK_KEY,
          $or: [{ expiresAt: { $lte: now } }, { expiresAt: { $exists: false } }],
        },
        {
          $set: {
            // Get this id from the configs
            holder: `${process.pid}`,
            acquiredAt: now,
            expiresAt,
          },
        },
        {
          upsert: true,
          returnDocument: 'after',
          writeConcern: { w: 'majority' },
        },
      )
      this.lockAcquired = true
    } catch {
      throw new MigrationLockAcquisitionError()
    }
  }

  /**
   * Renews the lock
   */
  public async renewLock(): Promise<void> {
    if (!this.lockAcquired) throw new MigrationLockNotAcquiredError()

    const { expiresAt } = this.getLockTimes()

    const result = await this.locksCollection.updateOne(
      { _id: MongoMigrationPlan.LOCK_KEY },
      { $set: { expiresAt: expiresAt } },
      { writeConcern: { w: 'majority' } },
    )

    if (!result.acknowledged) throw new MigrationLockRenewalError()
  }

  /**
   * Releases the lease lock by expiring it immediately.
   */
  public async releaseLock(): Promise<void> {
    const result = await this.locksCollection.updateOne(
      { _id: MongoMigrationPlan.LOCK_KEY },
      { $set: { expiresAt: new Date(0) } },
      { writeConcern: { w: 'majority' } },
    )

    if (!result.acknowledged) throw new MigrationLockReleaseError()
  }

  /**
   * Creates the relevant dates for a lock
   * @returns {{ now: Date, expiresAt: Date }} the relevant dates
   * @todo Also move into lock class
   */
  private getLockTimes(): { now: Date; expiresAt: Date } {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + MongoMigrationPlan.DEFAULT_LEASE_MS)

    return { now, expiresAt }
  }
}
