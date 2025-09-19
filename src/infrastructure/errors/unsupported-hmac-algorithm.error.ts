import { BaseError, ErrorKinds } from '@shared/errors.js'

/**
 * Error thrown when constructing an HMAC digester with an unsupported algorithm.
 * @augments {BaseError}
 */
export class UnsupportedHmacAlgorithmError extends BaseError {
  constructor(algo: string, supported: string[]) {
    super(
      ErrorKinds.system,
      'UNSUPPORTED_HMAC_ALGORITHM',
      `Unsupported HMAC algorithm: ${algo}. Supported algorithms: ${supported.join(', ')}`,
    )
    this.name = 'UnsupportedHmacAlgorithmError'
  }
}
