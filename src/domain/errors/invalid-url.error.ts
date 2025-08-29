import { BaseError, ErrorKinds } from 'shared/errors.js'

/**
 * Domain error class for handling invalid URL errors.
 * @param {string} reason - The reason for the invalid URL. Defaults to 'Unexpected Format'.
 * @augments {Error}
 */
export class InvalidUrlError extends BaseError {
  constructor(reason: string = 'Unexpected Format') {
    super(ErrorKinds.validation, 'INVALID_URL', `Invalid Url: ${reason}`)
    this.name = 'InvalidUrlError'
  }
}
