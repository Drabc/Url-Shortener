import { BaseError, ErrorKinds } from '@shared/errors.js'

/**
 * Error thrown when authentication is required but missing or invalid.
 * @augments {BaseError}
 */
export class UnauthorizedError extends BaseError {
  constructor(message = 'Unauthorized') {
    super(ErrorKinds.auth, 'UNAUTHORIZED', message)
    this.name = 'UnauthorizedError'
  }
}
