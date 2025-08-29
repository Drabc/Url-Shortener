import { BaseError, ErrorKind, ErrorKinds, SystemError } from './errors.js'

type OpenAPIValidationError = {
  type: string
  message: string
  status: number
  stack: string
}

/**
 * Convert an unknown thrown value into a BaseError.
 * - Passes through existing BaseError instances.
 * - Wraps simple strings or falsy values in SystemError.
 * - Maps OpenAPI validation errors via HTTP status to a (kind, type) pair.
 * @param {unknown} err The thrown value.
 * @returns {BaseError} Normalized application error.
 */
export function toBaseError(err: unknown): BaseError {
  if (err instanceof BaseError) return err
  if (typeof err === 'string') return new SystemError(err)
  if (!err) return new SystemError()

  const e = err as OpenAPIValidationError
  if (typeof e.status === 'number') {
    const { kind, type } = statusToKindType(e.status)
    return new BaseError(kind, type, e.message, e.stack)
  }
  return new SystemError()
}

/**
 * Map an HTTP status code to an application ErrorKind and canonical type string.
 * @param {number} status HTTP status code.
 * @returns {{ kind: ErrorKind, type: string }} Pair representing kind + type.
 */
function statusToKindType(status: number): { kind: ErrorKind; type: string } {
  if (status === 401) return { kind: ErrorKinds.auth, type: 'UNAUTHENTICATED' }
  if (status === 403) return { kind: ErrorKinds.forbidden, type: 'FORBIDDEN' }
  if (status === 404) return { kind: ErrorKinds.not_found, type: 'NOT_FOUND' }
  if (status === 409) return { kind: ErrorKinds.conflict, type: 'CONFLICT' }
  if (status === 429) return { kind: ErrorKinds.rate_limit, type: 'RATE_LIMIT' }
  if (status >= 400 && status < 500)
    return { kind: ErrorKinds.validation, type: 'VALIDATION' }
  if (status >= 500) return { kind: ErrorKinds.system, type: 'SYSTEM' }
  return { kind: ErrorKinds.unknown, type: 'UNKNOWN' }
}
