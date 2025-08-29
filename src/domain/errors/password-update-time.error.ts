import { BaseError, ErrorKinds } from '@shared/errors.js'

/**
 * Domain error when attempting to set a password update timestamp
 * that is not later than the current stored timestamp.
 * @augments {BaseError}
 */
export class PasswordUpdateTimeError extends BaseError {
  constructor() {
    super(
      ErrorKinds.domain,
      'PASSWORD_UPDATE_TIME',
      'New password update time must be later than the current one',
    )
    this.name = 'PasswordUpdateTimeError'
  }
}
