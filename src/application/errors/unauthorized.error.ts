import { BaseError, ErrorCategories } from '@shared/errors.js'

/**
 * Error thrown when authentication is required but missing or invalid.
 * @augments {BaseError}
 */
export class UnauthorizedError extends BaseError {
  constructor(message = 'Unauthorized') {
    super(ErrorCategories.unauthorized, 'UNAUTHORIZED', message)
    this.name = 'UnauthorizedError'
  }
}
