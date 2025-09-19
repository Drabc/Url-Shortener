import { BaseError, ErrorKinds } from '@shared/errors.js'

/**
 * Error thrown when user authentication fails due to invalid email or password.
 */
export class InvalidCredentialsError extends BaseError {
  constructor() {
    super(ErrorKinds.auth, 'INVALID_CREDENTIALS', 'Invalid credentials')
    this.name = 'InvalidCredentialsError'
  }
}
