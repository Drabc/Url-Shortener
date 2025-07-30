import { ErrorType } from './error-types.js'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly type: ErrorType,
    cause?: Error,
  ) {
    super(message)

    if (cause) {
      this.stack = cause.stack
    }
  }
}
