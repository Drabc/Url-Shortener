/**
 * Domain error class for handling invalid code errors.
 * @param {string} message - The error message. Defaults to 'Invalid Code'.
 * @augments {Error}
 */
export class InvalidCodeError extends Error {
  constructor(message: string = 'Invalid Code') {
    super(message)
  }
}
