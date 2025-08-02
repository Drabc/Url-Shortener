/**
 * Application error thrown when the maximum number of code generation attempts is reached.
 * @param {number} maxAttempts - The maximum number of attempts allowed.
 */
export class MaxCodeGenerationAttemptsError extends Error {
  constructor(maxAttempts: number) {
    super(`Maximum code generation attempts reached: ${maxAttempts}.`)
  }
}
