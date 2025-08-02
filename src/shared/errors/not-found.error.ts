import { ApiError } from './api.error.js'
import { ErrorType } from './error-types.js'

/**
 * Represents a Not Found error.
 * @augments ApiError
 * @param {string} resource - The name of the resource that was not found.
 */
export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(`${resource} not found`, ErrorType.NOT_FOUND, 404)
  }
}
