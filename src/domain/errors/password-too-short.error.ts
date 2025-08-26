/**
 * Domain error when provided password is shorter than minimum length.
 */
export class PasswordTooShortError extends Error {
  constructor() {
    super('Password is too short')
  }
}
