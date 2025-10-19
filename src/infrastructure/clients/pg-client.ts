import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg'

import { getRunner, SqlRunnerFetcher, SqlUnitOfWork } from '@infrastructure/db/txContext.js'
import {
  PgTransactionBeginError,
  PgTransactionCommitError,
} from '@infrastructure/errors/pg-client.error.js'
import { AsyncResult, Err, Ok } from '@shared/result.js'
import { InsertError } from '@infrastructure/errors/index.js'
import { errorFactory } from '@shared/errors.js'

const PG_ERROR = {
  UNIQUE: '23505',
} as const

/**
 * PostgreSQL client wrapper providing convenience methods for common query patterns.
 * @param {Pool} pool The pg Pool instance used to execute queries.
 */
export class PgClient {
  constructor(
    private pool: Pool,
    private sqlRunnerFetcher: SqlRunnerFetcher = getRunner,
  ) {}

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
   * Inserts a row using the provided SQL statement and parameters.
   * @param {string} query SQL insert (or upsert) statement to execute.
   * @param {unknown[]} values Parameter values for the query.
   * @returns {AsyncResult<void, InsertError>} void or InsertError on failure.
   */
  async insert(query: string, values: unknown[]): AsyncResult<void, InsertError> {
    try {
      const result = await this.pool.query(query, values)

      if (result.rowCount === 0) {
        return Err(errorFactory.infra('UniqueViolation', 'duplicate'))
      }
    } catch (err) {
      const e = err as { code?: string; detail?: string }

      if (e.code === PG_ERROR.UNIQUE) {
        return Err(errorFactory.infra('UniqueViolation', 'duplicate'))
      }

      return Err(
        errorFactory.infra('UnableToInsert', 'unknown', { cause: e.detail ?? String(err) }),
      )
    }
    return Ok(undefined)
  }

  /**
   * Executes a parameterized SQL query.
   * @template T Row type extending QueryResultRow.
   * @param {string} query SQL query string.
   * @param {unknown[]} [values] Optional parameter values for the query.
   * @returns {Promise<QueryResult<T>>} Full pg QueryResult containing rows and metadata.
   */
  query<T extends QueryResultRow>(query: string, values?: unknown[]): Promise<QueryResult<T>> {
    const runner = this.sqlRunnerFetcher() ?? this.pool
    return runner.query(query, values) as Promise<QueryResult<T>>
  }

  /**
   * Starts a new database transaction and returns a unit of work for executing queries, committing or rolling back.
   * @returns {Promise<SqlUnitOfWork>} Unit of work exposing query, commit and rollback helpers.
   */
  async begin(): Promise<SqlUnitOfWork> {
    const client: PoolClient = await this.pool.connect()
    try {
      await client.query('BEGIN')
    } catch (e) {
      client.release()
      throw new PgTransactionBeginError(e)
    }
    let finished = false
    const releaseIfNeeded = () => {
      if (!finished) {
        finished = true
        client.release()
      }
    }
    return {
      query: async <T>(text: string, params?: unknown[]) => {
        const result = await client.query(text, params)
        return { rows: result.rows as T[], rowCount: result.rowCount }
      },
      commit: async () => {
        if (finished) return
        try {
          await client.query('COMMIT')
        } catch (e) {
          releaseIfNeeded()
          throw new PgTransactionCommitError(e)
        }
        releaseIfNeeded()
      },
      rollback: async () => {
        if (finished) return
        try {
          await client.query('ROLLBACK')
        } finally {
          releaseIfNeeded()
        }
      },
    }
  }
}
