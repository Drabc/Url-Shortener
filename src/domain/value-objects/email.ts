import { DomainValidationError } from '@domain/errors/index.js'
import { errorFactory } from '@shared/errors.js'
import { Err, Ok, Result } from '@shared/result.js'

/**
 * Value object representing a validated email address.
 * @param {string} value The valid email
 */
export class Email {
  private constructor(public readonly value: string) {}

  /**
   * Creates an Email value object after validating the input string.
   * @param {string} raw - The raw email string to validate and normalize.
   * @returns {Result<Email, DomainValidationError>} An instance of Email or validation error.
   */
  public static create(raw: string): Result<Email, DomainValidationError> {
    const validEmailRegexp = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    const email = raw.normalize('NFC').trim()
    return !validEmailRegexp.test(email)
      ? Err(errorFactory.domain('InvalidEmail', 'validation', { message: 'Invalid email format' }))
      : Ok(new Email(email))
  }
}
