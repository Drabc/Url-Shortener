export class MaxCodeGenerationAttemptsError extends Error {
  constructor(maxAttempts: number) {
    super(`Maximum code generation attempts reached: ${maxAttempts}.`)
  }
}
