import { ApplicationError } from '@application/errors/base-application.error.js'
import { DomainError } from '@domain/errors/base-domain.error.js'

export type ErrorKind =
  | 'domain'
  | 'application'
  | 'infra'
  | 'validation'
  | 'conflict'
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
  application: 'application',
  infra: 'infra',
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
    super(ErrorKinds.system, 'SYSTEM', message, stack)
  }
}

export interface BaseErrorV2<K extends ErrorKind, T extends string> {
  kind: K
  type: T
  message?: string
  cause?: string
}

export type AnyError = DomainError | ApplicationError

export const errorFactory = {
  domain: <T extends string>(type: T, cause?: string): BaseErrorV2<'domain', T> => ({
    kind: 'domain',
    type,
    cause,
  }),
  app: <T extends string>(type: T, cause?: string): BaseErrorV2<'application', T> => ({
    kind: 'application',
    type,
    cause,
  }),
  infra: <T extends string>(type: T, cause?: string): BaseErrorV2<'infra', T> => ({
    kind: 'infra',
    type,
    cause,
  }),
}
