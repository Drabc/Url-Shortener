import { IUnitOfWork } from '@application/ports/unit-of-work.js'
import { PgClient } from '@infrastructure/clients/pg-client.js'

import { runWithRunner } from './txContext.js'

/**
 * Unit of Work implementation backed by a PostgreSQL client, coordinating execution within a single transaction boundary.
 * @param {PgClient} client PostgreSQL client used to create and manage transactions.
 * @param {typeof runWithRunner} _runWithRunner Helper function that executes callbacks within the provided transaction runner context.
 * @implements {IUnitOfWork}
 */
export class PgUnitOfWork implements IUnitOfWork {
  constructor(
    private readonly client: PgClient,
    private readonly _runWithRunner: typeof runWithRunner = runWithRunner,
  ) {}

  /**
   * Executes the provided function within a database transaction boundary.
   * Begins a transaction, runs the callback using the transaction runner and commits on success,
   * rolling back and rethrowing the error if the callback fails.
   * @template T The return type of the callback.
   * @param {() => Promise<T>} fn The asynchronous callback to execute within the transaction.
   * @returns {Promise<T>} A promise resolving to the callback result if successful.
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    const tx = await this.client.begin()
    try {
      const result = await this._runWithRunner(tx, fn)
      await tx.commit()
      return result
    } catch (e) {
      try {
        tx.rollback()
      } catch {}
      throw e
    }
  }
}
