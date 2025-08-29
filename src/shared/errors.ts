export type ErrorKind =
  | 'validation'
  | 'conflict'
  | 'domain'
  | 'system'
  | 'not_found'
  | 'auth'
  | 'forbidden'
  | 'rate_limit'
  | 'unknown'

export const ErrorKinds: Record<ErrorKind, ErrorKind> = {
  validation: 'validation',
  conflict: 'conflict',
  domain: 'domain',
  system: 'system',
  not_found: 'not_found',
  auth: 'auth',
  forbidden: 'forbidden',
  rate_limit: 'rate_limit',
  unknown: 'unknown',
} as const

/**
 * BaseError is the abstract base class for all custom application errors.
 * @param {ErrorKind} kind The generic app error kind.
 * @param {string} type A machine readable error type.
 * @param {string} [message] Optimal message describing the error.
 * @augments {Error}
 */
export class BaseError extends Error {
  constructor(
    public readonly kind: ErrorKind,
    public readonly type: string,
    message?: string,
    stack?: string,
  ) {
    super(message)
    if (stack) this.stack = stack
  }
}

/**
 * SystemError represents unexpected internal failures (e.g. infrastructure, I/O) and wraps them in a consistent application error.
 * @param {string} [message] Optional message describing the system failure.
 * @augments {BaseError}
 */
export class SystemError extends BaseError {
  constructor(message?: string) {
    super(ErrorKinds.system, 'SYSTEM', message)
  }
}
