import { PasswordTooLongError } from '@domain/errors/password-too-long.error.js'
import { PasswordTooShortError } from '@domain/errors/password-too-short.error.js'
import { PasswordTooWeakError } from '@domain/errors/password-too-weak.error.js'

const MINIMUM_LENGTH = 8 as const
const MAX_BYTES = 1024 as const //1kb
const STRENGTH_REGEXP = /^(?=.*\p{Lu})(?=.*[\p{P}\p{S}]).+$/u

/**
 * Value object representing a validated password.
 * Use Password.create to construct after passing all validation rules.
 * @param value The already validated password string.
 */
export class Password {
  constructor(public readonly value: string) {}

  /**
   * Validates the provided plain password and returns a Password instance.
   * Requires minimum length, max byte size, at least one uppercase and one symbol.
   * @param {string} plain The plain password to validate.
   * @throws {Error} If validation fails.
   * @returns {Password} A new Password value object.
   */
  public static create(plain: string) {
    if (plain.length < MINIMUM_LENGTH) {
      throw new PasswordTooShortError()
    }

    if (new TextEncoder().encode(plain).length > MAX_BYTES) {
      throw new PasswordTooLongError()
    }

    if (!STRENGTH_REGEXP.test(plain)) {
      throw new PasswordTooWeakError()
    }

    return new Password(plain)
  }
}
