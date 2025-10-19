import { BaseError, ErrorCategories } from '@shared/errors.js'

/**
 * Error thrown when constructing an HMAC digester with an unsupported algorithm.
 * @augments {BaseError}
 */
export class UnsupportedHmacAlgorithmError extends BaseError {
  constructor(algo: string, supported: string[]) {
    super(
      ErrorCategories.internal_error,
      'UNSUPPORTED_HMAC_ALGORITHM',
      `Unsupported HMAC algorithm: ${algo}. Supported algorithms: ${supported.join(', ')}`,
    )
    this.name = 'UnsupportedHmacAlgorithmError'
  }
}
