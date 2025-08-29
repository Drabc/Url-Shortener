import { BaseError, ErrorKinds } from 'shared/errors.js'

/**
 * Error thrown when a requested resource cannot be found.
 * @param resource Name or identifier of the missing resource.
 * @augments {BaseError}
 */
export class NotFoundError extends BaseError {
  constructor(resource: string) {
    super(ErrorKinds.not_found, 'RESOURCE_NOT_FOUND', `${resource} Not Found`)
    this.name = 'NotFoundError'
  }
}
