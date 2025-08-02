/**
 * Domain error class for handling invalid URL errors.
 * @param {string} reason - The reason for the invalid URL. Defaults to 'Unexpected Format'.
 * @augments {Error}
 */
export class InvalidUrlError extends Error {
  constructor(reason: string = 'Unexpected Format') {
    super(`Invalid Url: ${reason}`)
  }
}
