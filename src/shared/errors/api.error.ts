export class ApiError extends Error {
  public readonly statusCode: number

  constructor(message: string, statusCode: number = 500, cause?: Error) {
    super(message)
    this.statusCode = statusCode

    if(cause) {
      this.stack = cause.stack
    }
  }
}
