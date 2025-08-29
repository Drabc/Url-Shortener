import { BaseError, ErrorKinds } from 'shared/errors.js'

/**
 * Domain error when provided password exceeds maximum byte size.
 * @augments {BaseError}
 */
export class PasswordTooLongError extends BaseError {
  constructor() {
    super(ErrorKinds.validation, 'INVALID_PASSWORD', 'Password too long')
    this.name = 'PasswordTooLongError'
  }
}
