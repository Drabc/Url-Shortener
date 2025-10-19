import { Err, Ok, Result } from '@shared/result.js'
import { DomainValidationError } from '@domain/errors/index.js'
import { errorFactory } from '@shared/errors.js'

/**
 * Ensures that the provided value is not null, undefined, or an empty string.
 * @param {unknown} value - The value to check.
 * @param {string} resource - Optional resource name for error context.
 * @returns {Result<void, DomainValidationError>} Validation error if empty
 */
export function requireNonEmpty(
  value: unknown,
  resource: string = 'Value',
): Result<void, DomainValidationError> {
  if (value == undefined || (typeof value === 'string' && value.trim() === '')) {
    return Err(
      errorFactory.domain('InvalidValue', 'validation', {
        message: `${resource} must not be empty`,
      }),
    )
  }
  return Ok(undefined)
}
