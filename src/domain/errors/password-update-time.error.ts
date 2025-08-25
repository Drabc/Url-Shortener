/**
 * Domain error when attempting to set a password update timestamp
 * that is not later than the current stored timestamp.
 */
export class PasswordUpdateTimeError extends Error {
  constructor() {
    super('New password update time must be later than the current one')
  }
}
