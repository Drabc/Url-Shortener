import { BaseError, ErrorCategories, SystemError, ErrorCategory } from './errors.js'

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
    const { category, type } = statusToCategory(e.status)
    return new BaseError(category, type, e.message, e.stack)
  }
  return new SystemError(e.message, e.stack)
}

/**
 * Map an HTTP status code to an application ErrorKind and canonical type string.
 * @param {number} status HTTP status code.
 * @returns {{ category: ErrorCategory, type: string }} Pair representing category + type.
 */
function statusToCategory(status: number): { category: ErrorCategory; type: string } {
  if (status === 401) return { category: ErrorCategories.unauthorized, type: 'UNAUTHENTICATED' }
  if (status === 403) return { category: ErrorCategories.forbidden, type: 'FORBIDDEN' }
  if (status === 404) return { category: ErrorCategories.not_found, type: 'NOT_FOUND' }
  if (status === 409) return { category: ErrorCategories.conflict, type: 'CONFLICT' }
  if (status === 429) return { category: ErrorCategories.rate_limited, type: 'RATE_LIMIT' }
  if (status >= 400 && status < 500)
    return { category: ErrorCategories.validation, type: 'VALIDATION' }
  if (status >= 500) return { category: ErrorCategories.internal_error, type: 'SYSTEM' }
  return { category: ErrorCategories.unknown, type: 'UNKNOWN' }
}
