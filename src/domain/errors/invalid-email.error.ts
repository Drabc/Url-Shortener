/**
 * Domain error for invalid email format or value.
 * @param {string} value - The invalid email value.
 */
export class InvalidEmailError extends Error {
  constructor(value: string) {
    super(`Invalid Email: ${value}`)
  }
}
