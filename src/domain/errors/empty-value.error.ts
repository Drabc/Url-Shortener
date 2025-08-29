import { BaseError, ErrorKinds } from 'shared/errors.js'

/**
 * Domain error when email is empty or only whitespace.
 * @param {string} resource - the name of the value which must not be empty.
 * @augments {BaseError}
 */
export class EmptyValueError extends BaseError {
  constructor(resource: string = 'Value') {
    super(ErrorKinds.validation, 'EMPTY_VALUE', `${resource} must not be empty`)
    this.name = 'EmptyValueError'
  }
}
