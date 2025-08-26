/**
 * Domain error when provided password does not meet strength requirements.
 */
export class PasswordTooWeakError extends Error {
  constructor() {
    super('Password is too weak. Requires one uppercase and one symbol')
  }
}
