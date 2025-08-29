import { BaseError, ErrorKinds } from 'shared/errors.js'

/**
 * Domain error when provided password does not meet strength requirements.
 * @augments {BaseError}
 */
export class PasswordTooWeakError extends BaseError {
  constructor() {
    super(
      ErrorKinds.validation,
      'INVALID_PASSWORD',
      'Password is too weak. Requires one uppercase and one symbol',
    )
    this.name = 'PasswordTooWeakError'
  }
}
