/**
 * Utility for formatting cookie values, specifically for refresh tokens.
 * Handles encoding Buffer values to hex strings and decoding hex strings back to Buffers.
 */
export class CookieFormatter {
  /**
   * Encodes a Buffer value to a hex string for cookie storage.
   * @param {Buffer} value The Buffer value to encode.
   * @returns {string} The hex-encoded string.
   */
  encodeRefreshToken(value: Buffer): string {
    return value.toString('hex')
  }

  /**
   * Decodes a hex string from a cookie back to a Buffer.
   * @param {string} value The hex-encoded string from the cookie.
   * @returns {Buffer} The decoded Buffer value.
   */
  decodeRefreshToken(value: string): Buffer {
    return Buffer.from(value, 'hex')
  }

  /**
   * Safely decodes a refresh token from a cookie, returning undefined if the value is invalid.
   * @param {string | undefined} cookieValue The cookie value to decode.
   * @returns {Buffer | undefined} The decoded Buffer or undefined if invalid.
   */
  safeDecodeRefreshToken(cookieValue: string | undefined): Buffer | undefined {
    if (!cookieValue) {
      return undefined
    }

    try {
      return this.decodeRefreshToken(cookieValue)
    } catch {
      // Invalid hex string - return undefined
      return undefined
    }
  }
}
