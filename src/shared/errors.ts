import { ApplicationError } from '@application/errors/index.js'
import { DomainError } from '@domain/errors/index.js'
import { InfrastructureError } from '@infrastructure/errors/index.js'

export type ErrorKind = 'domain' | 'application' | 'infra'

export type ErrorCategory =
  | 'validation'
  | 'not_found'
  | 'duplicate'
  | 'conflict'
  | 'forbidden'
  | 'unauthorized'
  | 'rate_limited'
  | 'unavailable'
  | 'internal_error'
  | 'unknown'

export const ErrorCategories: Record<ErrorCategory, ErrorCategory> = {
  validation: 'validation',
  conflict: 'conflict',
  internal_error: 'internal_error',
  not_found: 'not_found',
  unauthorized: 'unauthorized',
  forbidden: 'forbidden',
  rate_limited: 'rate_limited',
  unknown: 'unknown',
  duplicate: 'duplicate',
  unavailable: 'unavailable',
} as const

/**
 * BaseError is the abstract base class for all custom application errors.
 * @param {ErrorCategory} category The error category.
 * @param {string} type A machine readable error type.
 * @param {string} [message] Optimal message describing the error.
 * @augments {Error}
 */
export class BaseError extends Error {
  constructor(
    public readonly category: ErrorCategory,
    public readonly type: string,
    message?: string,
    public readonly internalMessage?: string,
  ) {
    super(message)
  }
}

/**
 * SystemError represents unexpected internal failures (e.g. infrastructure, I/O) and wraps them in a consistent application error.
 * @param {string} [message] Optional message describing the system failure.
 * @param {string} [stack] stacktrace
 * @augments {BaseError}
 */
export class SystemError extends BaseError {
  constructor(message?: string, stack?: string) {
    super(ErrorCategories.internal_error, 'INTERNAL_ERROR', message, stack)
  }
}

export interface BaseResultError<K extends ErrorKind, T extends string> {
  kind: K
  type: T
  category: ErrorCategory
  message?: string
  cause?: string
}

export type AnyError = DomainError | ApplicationError | InfrastructureError

type ErrorDetail = { message?: string; cause?: string }

export const errorFactory = {
  domain: <T extends string>(
    type: T,
    category: ErrorCategory,
    details?: ErrorDetail,
  ): BaseResultError<'domain', T> => ({
    kind: 'domain',
    type,
    category,
    cause: details?.cause,
    message: details?.message,
  }),
  app: <T extends string>(
    type: T,
    category: ErrorCategory,
    details?: ErrorDetail,
  ): BaseResultError<'application', T> => ({
    kind: 'application',
    type,
    category,
    cause: details?.cause,
    message: details?.message,
  }),
  infra: <T extends string>(
    type: T,
    category: ErrorCategory,
    details?: ErrorDetail,
  ): BaseResultError<'infra', T> => ({
    kind: 'infra',
    type,
    category,
    cause: details?.cause,
    message: details?.message,
  }),
}
