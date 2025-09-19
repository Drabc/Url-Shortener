import { BaseError, ErrorKinds } from '@shared/errors.js'

/**
 * Error thrown when an access token is invalid or malformed.
 * @param message Optional human-readable detail about why the token is invalid.
 */
export class InvalidAccessToken extends BaseError {
  constructor(message?: string) {
    super(ErrorKinds.validation, 'INVALID_ACCESS_TOKEN', message)
  }
}
