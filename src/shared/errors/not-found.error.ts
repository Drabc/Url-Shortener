import { ApiError } from './api.error.js'
import { ErrorType } from './error-types.js'

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, ErrorType.NOT_FOUND)
  }
}
