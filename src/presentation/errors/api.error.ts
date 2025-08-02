import { ErrorType } from '@presentation/errors/error-types.js'

/**
 * Represents an API error with a message, status code, and type.
 * @augments Error
 * @param {string} message - The error message.
 * @param {ErrorType} type - The type of the error.
 * @param {number} [statusCode=500] - The HTTP status code for the error.
 * @param {Error} [cause] - The original error that caused this error, if any.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly type: ErrorType,
    public readonly statusCode: number = 500,
    cause?: Error,
  ) {
    super(message)

    if (cause) {
      this.stack = cause.stack
    }
  }
}
