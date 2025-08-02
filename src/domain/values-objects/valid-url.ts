import { InvalidUrlError } from '../errors/invalid-url.error.js'

/**
 * Value object representing a valid URL.
 * Validates the URL format and ensures it starts with 'http' or 'https'.
 * @param {string} value - The URL string to validate.
 * @throws {InvalidUrlError} Thrown if the URL is invalid.
 */
export class ValidUrl {
  constructor(public readonly value: string) {
    if (!value) throw new InvalidUrlError('Must Not Be Empty')

    if (!value.startsWith('http')) {
      throw new InvalidUrlError('Must Start With http or https')
    }

    try {
      new URL(value)
    } catch {
      throw new InvalidUrlError()
    }
  }
}
