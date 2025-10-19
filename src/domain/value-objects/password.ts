import { Ok, Err, Result } from '@shared/result.js'
import { errorFactory } from '@shared/errors.js'
import { InvalidPassword } from '@domain/errors/index.js'

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
   * Validates the provided plain password and returns a Result of Password.
   * Requires minimum length, max byte size, at least one uppercase and one symbol.
   * @param {string} plain The plain password to validate.
   * @returns {Result<Password, InvalidPassword>} Password or InvalidPassword
   */
  public static create(plain: string): Result<Password, InvalidPassword> {
    if (plain.length < MINIMUM_LENGTH) {
      return Err(
        errorFactory.domain('InvalidPassword', 'validation', {
          message: 'Password is too short',
        }),
      )
    }

    if (new TextEncoder().encode(plain).length > MAX_BYTES) {
      return Err(
        errorFactory.domain('InvalidPassword', 'validation', {
          message: 'Password too long',
        }),
      )
    }

    if (!STRENGTH_REGEXP.test(plain)) {
      return Err(
        errorFactory.domain('InvalidPassword', 'validation', {
          message: 'Password is too weak. Requires one uppercase and one symbol',
        }),
      )
    }

    return Ok(new Password(plain))
  }
}
