import { BaseError, ErrorKinds } from '@shared/errors.js'

/**
 * Domain error for invalid email format or value.
 * @param {string} value - The invalid email value.
 * @augments {BaseError}
 */
export class InvalidEmailError extends BaseError {
  constructor(value: string) {
    super(ErrorKinds.validation, 'INVALID_EMAIL', `Invalid Email: ${value}`)
    this.name = 'InvalidEmailError'
  }
}
