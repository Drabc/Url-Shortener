import { InvalidUrl } from '@domain/errors/index.js'
import { errorFactory } from '@shared/errors.js'
import { Err, Ok, Result } from '@shared/result.js'

/**
 * Value object representing a valid URL.
 * Validates the URL format and ensures it starts with 'http' or 'https'.
 * @param {string} value - The URL string to validate.
 */
export class ValidUrl {
  /**
   * Creates a ValidUrl value object after validating the provided string.
   * Validates that the value is non-empty, starts with http/https and is a well-formed URL.
   * @param {string} value The raw URL string to validate.
   * @returns {Result<ValidUrl, InvalidUrl>} Ok(ValidUrl) if valid; Err(InvalidUrl) if invalid.
   */
  public static create(value: string): Result<ValidUrl, InvalidUrl> {
    const errorResponse = (message: string) =>
      Err(errorFactory.domain('InvalidUrl', 'validation', { message }))

    if (!value) return errorResponse('Must Not Be Empty')

    if (!value.startsWith('http')) errorResponse('Must Start With http or https')

    try {
      new URL(value)
      return Ok(new ValidUrl(value))
    } catch {
      return errorResponse('Malformed Url')
    }
  }

  private constructor(public readonly value: string) {}
}
