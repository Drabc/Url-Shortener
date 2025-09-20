import { AsyncLocalStorage } from 'node:async_hooks'

interface SqlRunner {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>
}

interface sqlTransaction {
  commit(): Promise<void>
  rollback(): Promise<void>
}

export interface SqlUnitOfWork extends SqlRunner, sqlTransaction {}

export type SqlRunnerFetcher = () => SqlRunner | undefined

const requestCtx = new AsyncLocalStorage<SqlRunner>()

/**
 * Retrieves the SqlRunner associated with the current asynchronous execution context.
 * @returns {SqlRunner} The active SqlRunner or undefined if none is bound.
 */
export const getRunner: SqlRunnerFetcher = () => requestCtx.getStore()

/**
 * Runs the provided asynchronous function within a scoped async context that exposes
 * the supplied SqlRunner to downstream code via getRunner().
 * @param {SqlRunner} runner The SqlRunner to bind.
 * @param {() => Promise} fn The asynchronous function to execute.
 * @returns {Promise} The result of fn.
 */
export const runWithRunner = <T>(runner: SqlRunner, fn: () => Promise<T>) =>
  requestCtx.run(runner, fn)
