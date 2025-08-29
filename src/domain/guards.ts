import { EmptyValueError } from '@domain/errors/empty-value.error.js'

/**
 * Ensures that the provided value is not null, undefined, or an empty string.
 * @param {unknown} value - The value to check.
 * @param {string} resource - Optional resource name for error context.
 * @throws EmptyResourceError if value is empty.
 */
export function requireNonEmpty(value: unknown, resource?: string) {
  if (
    value == undefined ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    throw new EmptyValueError(resource)
  }
}
