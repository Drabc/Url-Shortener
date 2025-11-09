import { Pool, QueryResult, QueryResultRow } from 'pg'

import { PgClient } from '@infrastructure/clients/pg-client.js'
import { getRunner, SqlRunnerFetcher, SqlUnitOfWork } from '@infrastructure/db/txContext.js'

/**
 * Test-specific PgClient that avoids opening real DB transactions while still executing queries against the provided pool.
 *
 * This class is used in integration / unit tests to simplify transaction handling by returning a SqlUnitOfWork
 * whose commit and rollback operations are no-ops, while queries run directly on the underlying pool.
 * @param {Pool} pool The PostgreSQL connection pool against which queries are executed directly.
 * @param {SqlRunnerFetcher} [sqlRunnerFetcher=getRunner] Factory used to obtain a SqlRunner (defaults to getRunner).
 */
export class PgClientOverwrite extends PgClient {
  constructor(pool: Pool, sqlRunnerFetcher: SqlRunnerFetcher = getRunner) {
    super(pool, sqlRunnerFetcher)
  }

  /**
   * Overwrite fetching running since no real transaction is used in tests.
   * @template T Row type extending QueryResultRow.
   * @param {string} query SQL query string.
   * @param {unknown[]} [values] Optional parameter values for the query.
   * @returns {Promise<QueryResult<T>>} Full pg QueryResult containing rows and metadata.
   */
  async query<T extends QueryResultRow>(
    query: string,
    values?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.pool.query(query, values) as Promise<QueryResult<T>>
  }

  /**
   * Starts a unit of work for tests without opening a real transaction.
   * The returned SqlUnitOfWork executes queries directly against the pool and
   * provides no-op commit and rollback operations.
   * @returns {Promise<SqlUnitOfWork>} SqlUnitOfWork test double with direct pool querying and no-op commit/rollback.
   */
  async begin(): Promise<SqlUnitOfWork> {
    return {
      query: async <T>(sql: string, params?: unknown[]) => {
        const result = await this.pool.query(sql, params)
        return { rows: result.rows as T[], rowCount: result.rowCount }
      },
      commit: () => Promise.resolve(),
      rollback: () => Promise.resolve(),
    }
  }
}

/**
 * Factory helper to create a PgClientOverwrite instance for tests, bypassing real transactions.
 * @param {Pool} pool PostgreSQL connection pool used to execute queries directly.
 * @returns {PgClientOverwrite} Test Pg client that provides no-op transactional behavior.
 */
export function createPgClientOverwrite(pool: Pool): PgClientOverwrite {
  return new PgClientOverwrite(pool)
}
