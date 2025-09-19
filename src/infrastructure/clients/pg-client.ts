import { Pool, QueryResult, QueryResultRow } from 'pg'

import { EntityAlreadyExistsError } from '@infrastructure/errors/repository.error.js'

const PG_ERROR = {
  UNIQUE: '23505',
} as const

/**
 * PostgreSQL client wrapper providing convenience methods for common query patterns.
 * @param {Pool} pool The pg Pool instance used to execute queries.
 */
export class PgClient {
  constructor(private pool: Pool) {}

  /**
   * Executes a query expected to return at most one row.
   * @template T Row type extending QueryResultRow.
   * @param {string} query SQL query string.
   * @param {unknown[]} values Optional parameter values for the query.
   * @returns {Promise<T | null>} The first row if present, otherwise null.
   */
  async findOne<T extends QueryResultRow>(query: string, values?: unknown[]): Promise<T | null> {
    const result = await this.pool.query<T>(query, values)
    return result.rows[0] || null
  }

  /**
   * Executes a query expected to return zero or more rows.
   * @template T Row type extending QueryResultRow.
   * @param {string} query SQL query string.
   * @param {unknown[]} [values] Optional parameter values for the query.
   * @returns {Promise<T[]>} Array of rows (empty if none).
   */
  async findMany<T extends QueryResultRow>(query: string, values?: unknown[]): Promise<T[]> {
    const result = await this.pool.query<T>(query, values)
    return result.rows
  }

  /**
   * Executes an insert query and throws EntityAlreadyExistsError on unique violation or when no rows were inserted.
   * @param {string} query SQL insert (or upsert) statement to execute.
   * @param {unknown[]} values Parameter values for the query.
   * @throws {EntityAlreadyExistsError} If a unique constraint is violated or no row was inserted.
   */
  async insertOrThrow(query: string, values: unknown[]): Promise<void> {
    try {
      const result = await this.pool.query(query, values)

      if (result.rowCount === 0) {
        throw new EntityAlreadyExistsError()
      }
    } catch (err) {
      const e = err as { code?: string; detail?: string }

      if (e.code === PG_ERROR.UNIQUE) {
        throw new EntityAlreadyExistsError()
      }

      throw e
    }
  }

  /**
   * Executes a parameterized SQL query.
   * @template T Row type extending QueryResultRow.
   * @param {string} query SQL query string.
   * @param {unknown[]} [values] Optional parameter values for the query.
   * @returns {Promise<QueryResult<T>>} Full pg QueryResult containing rows and metadata.
   */
  query<T extends QueryResultRow>(query: string, values?: unknown[]): Promise<QueryResult<T>> {
    return this.pool.query(query, values)
  }
}
