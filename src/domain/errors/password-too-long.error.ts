/**
 * Domain error when provided password exceeds maximum byte size.
 */
export class PasswordTooLongError extends Error {
  constructor() {
    super('Password too long')
  }
}
