import { BaseError, ErrorCategories } from '@shared/errors.js'

/**
 * Error thrown when a PostgreSQL transaction cannot be started.
 * @augments {BaseError}
 */
export class PgTransactionBeginError extends BaseError {
  constructor(cause?: unknown) {
    const stack = cause instanceof Error ? cause.stack : undefined
    super(
      ErrorCategories.internal_error,
      'PG_TX_BEGIN_FAILURE',
      'Unable to start transaction',
      stack,
    )
    this.name = 'PgTransactionBeginError'
  }
}

/**
 * Error thrown when a PostgreSQL transaction cannot be committed.
 * @augments {BaseError}
 */
export class PgTransactionCommitError extends BaseError {
  constructor(cause?: unknown) {
    const stack = cause instanceof Error ? cause.stack : undefined
    super(
      ErrorCategories.internal_error,
      'PG_TX_COMMIT_FAILURE',
      'Failed to commit transaction',
      stack,
    )
    this.name = 'PgTransactionCommitError'
  }
}
