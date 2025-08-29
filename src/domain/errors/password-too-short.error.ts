import { BaseError, ErrorKinds } from 'shared/errors.js'

/**
 * Domain error when provided password is shorter than minimum length.
 * @augments {BaseError}
 */
export class PasswordTooShortError extends BaseError {
  constructor() {
    super(ErrorKinds.validation, 'INVALID_PASSWORD', 'Password is too short')
    this.name = 'PasswordTooShortError'
  }
}
