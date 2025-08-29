import { BaseError, ErrorKinds } from '@shared/errors.js'

/**
 * Application error thrown when the maximum number of code generation attempts is reached.
 * @param {number} maxAttempts - The maximum number of attempts allowed.
 * @augments {BaseError}
 */
export class MaxCodeGenerationAttemptsError extends BaseError {
  constructor(maxAttempts: number) {
    super(
      ErrorKinds.system,
      'MAX_CODE_ATTEMPTS',
      `Maximum code generation attempts reached: ${maxAttempts}.`,
    )
    this.name = 'MaxCodeGenerationAttemptsError'
  }
}
