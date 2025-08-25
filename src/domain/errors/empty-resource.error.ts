/**
 * Domain error when email is empty or only whitespace.
 */
export class EmptyResourceError extends Error {
  constructor(resource: string = 'Resource') {
    super(`${resource} must not be empty`)
  }
}
