import { InvalidEmailError } from '@domain/errors/invalid-email.error.js'

/**
 * Value object representing a validated email address.
 * @param {string} value The valid email
 */
export class Email {
  private constructor(public readonly value: string) {}

  /**
   * Creates an Email value object after validating the input string.
   * @param {string} raw - The raw email string to validate and normalize.
   * @returns {Email} An instance of Email if valid.
   * @throws InvalidEmailError if the email format is invalid.
   */
  public static create(raw: string): Email {
    const validEmailRegexp = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    const email = raw.normalize('NFC').trim()
    if (!validEmailRegexp.test(email)) throw new InvalidEmailError(email)
    return new Email(email)
  }
}
