import type { Pool } from 'pg'

import {
  Migration,
  MigrationPlan,
} from '@infrastructure/db/migrations/types.js'
import {
  MigrationCommitError,
  MigrationLockAcquisitionError,
  MigrationLockReleaseError,
} from '@infrastructure/errors/migration.error.js'

/**
 * Postgres-specific migration plan using a lock table and migrations table.
 * Locking uses a dedicated table with a single row and a lease expiration,
 * similar to the Mongo plan semantics.
 */
export class PostgresMigrationPlan extends MigrationPlan<Pool> {
  private static readonly LOCK_KEY = 'postgres'
  private static readonly MIGRATIONS_TABLE = 'meta.schema_migrations'
  private static readonly LOCKS_TABLE = 'meta.migration_locks'
  private static readonly DEFAULT_LEASE_MS = 10 * 60_000
  private lockAcquired: boolean = false

  /**
   * Returns the display name for the migration plan.
   * @returns {string} The display name
   */
  public get displayName(): string {
    return 'Postgres Migration Plan'
  }

  /**
   * Records a migration as committed.
   * @param {Migration<Pool>} migration - The migration to commit
   * @returns {Promise<void>}
   */
  public async commitMigration(migration: Migration<Pool>): Promise<void> {
    const res = await this.ctx.query(
      `insert into ${PostgresMigrationPlan.MIGRATIONS_TABLE} (id) values ($1)`,
      [migration.id],
    )
    if (res.rowCount !== 1) throw new MigrationCommitError(migration.id)
  }

  /**
   * Acquires a lease-based lock to prevent concurrent runners.
   * @returns {Promise<void>}
   */
  public async acquireLock(): Promise<void> {
    const now = new Date()
    const expiresAt = new Date(
      now.getTime() + PostgresMigrationPlan.DEFAULT_LEASE_MS,
    )

    // Try upsert only when not held or expired
    try {
      const res = await this.ctx.query(
        `insert into ${PostgresMigrationPlan.LOCKS_TABLE} (id, holder, acquired_at, expires_at)
         values ($1, $2, $3, $4)
         on conflict (id)
         do update set
           holder = excluded.holder,
           acquired_at = excluded.acquired_at,
           expires_at = excluded.expires_at
         where ${PostgresMigrationPlan.LOCKS_TABLE}.expires_at <= excluded.acquired_at`,
        [PostgresMigrationPlan.LOCK_KEY, `${process.pid}`, now, expiresAt],
      )
      if (res.rowCount !== 1) throw new MigrationLockAcquisitionError()
      this.lockAcquired = true
    } catch (e) {
      const details = e instanceof Error ? e.message : (e as string)
      throw new MigrationLockAcquisitionError(details)
    }
  }

  /**
   * Releases the lock by expiring it immediately.
   * @returns {Promise<void>}
   */
  public async releaseLock(): Promise<void> {
    if (!this.lockAcquired) return

    const res = await this.ctx.query(
      `update ${PostgresMigrationPlan.LOCKS_TABLE} set expires_at = $2 where id = $1`,
      [PostgresMigrationPlan.LOCK_KEY, new Date(0)],
    )
    if (res.rowCount !== 1) throw new MigrationLockReleaseError()
  }
}
