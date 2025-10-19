const MINIMUM_ENTROPY = 16
const MAXIMUM_ENTROPY = 32

/**
 * Value object representing a plain (unhashed) refresh secret.
 * Provides validation to ensure the byte length is within the allowed entropy range.
 * @param {Buffer} value Buffer containing the refresh secret bytes.
 */
export class PlainRefreshSecret {
  /**
   * Create a PlainRefreshSecret value object from a raw Buffer.
   * @param {Buffer} value Buffer containing the refresh secret bytes.
   * @returns {PlainRefreshSecret} A new PlainRefreshSecret instance.
   */
  static fromBytes(value: Buffer): PlainRefreshSecret {
    if (value.length < MINIMUM_ENTROPY || value.length > MAXIMUM_ENTROPY) {
      throw new Error(
        `Refresh Secret must be between ${MINIMUM_ENTROPY} and ${MAXIMUM_ENTROPY} bytes`,
      )
    }

    return new PlainRefreshSecret(value)
  }

  private constructor(public readonly value: Buffer) {}
}
