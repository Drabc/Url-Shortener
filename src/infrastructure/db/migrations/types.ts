import { ClientValue } from '@infrastructure/clients/types.js'

/**
 * Base migration class to enforce constructor signature.
 * @template T - The type of the database context. Supports MongoDB (Db).
 * @param ctx - The database context.
 * @param id - The migration ID.
 * @returns A new migration instance.
 */
export abstract class Migration<T extends ClientValue> {
  constructor(
    protected readonly ctx: T,
    public readonly id: string,
  ) {}
  abstract up(): Promise<void>
}

/**
 * Base migration plan class to enforce constructor signature.
 * @template T - The type of the database context. Supports MongoDB (Db).
 * @param migrations - The migrations to be executed.
 * @returns A new migration plan instance.
 */
export abstract class MigrationPlan<T extends ClientValue> {
  abstract displayName: string

  constructor(
    public readonly migrations: Migration<T>[],
    protected readonly ctx: T,
  ) {}
  abstract commitMigration(migration: Migration<T>): Promise<void>
  abstract acquireLock(): Promise<void>
  abstract releaseLock(): Promise<void>
}
