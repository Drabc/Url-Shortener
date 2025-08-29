import { requireNonEmpty } from '@domain/guards.js'
import { BaseEntity } from '@domain/entities/base-entity.js'
import { Email } from '@domain/value-objects/email.js'
import { PasswordUpdateTimeError } from '@domain/errors/password-update-time.error.js'

/**
 * Domain entity representing an application user.
 * @param {string} id User identifier.
 * @param {string} firstName First name (non-empty).
 * @param {string} lastName Last name (non-empty).
 * @param {Email} email Email value object.
 * @param {string} passwordHash Password hash (non-empty).
 * @param {Date} passwordUpdatedAt Time of last password update.
 */
export class User extends BaseEntity {
  private _email: Email

  /**
   * Gets the user's first name.
   * @returns {string} First name.
   */
  get firstName(): string {
    return this._firstName
  }

  /**
   * Sets the user's first name.
   * @param {string} value Non-empty first name.
   */
  set firstName(value: string) {
    requireNonEmpty(value)
    this._firstName = value
  }

  /**
   * Gets the user's last name.
   * @returns {string} Last name.
   */
  get lastName(): string {
    return this._lastName
  }

  /**
   * Sets the user's last name.
   * @param {string} value Non-empty last name.
   */
  set lastName(value: string) {
    requireNonEmpty(value)
    this._lastName = value
  }

  /**
   * Gets the user's email value object.
   * @returns {Email} Email.
   */
  get email(): Email {
    return this._email
  }

  /**
   * Sets the user's email (string will be converted to Email VO).
   * @param {Email|string} value Email value object or raw string.
   */
  set email(value: Email | string) {
    this._email = typeof value === 'string' ? Email.create(value) : value
  }

  /**
   * Gets the stored password hash.
   * @returns {string} Password hash.
   */
  get passwordHash(): string {
    return this._passwordHash
  }

  /**
   * Gets the timestamp of the last password update.
   * @returns {Date} Password updated at.
   */
  get passwordUpdatedAt(): Date {
    return this._passwordUpdatedAt
  }

  constructor(
    id: string,
    private _firstName: string,
    private _lastName: string,
    _email: Email | string,
    private _passwordHash: string,
    private _passwordUpdatedAt: Date,
  ) {
    super(id)
    this._email = typeof _email === 'string' ? Email.create(_email) : _email
  }

  /**
   * Updates the user's password hash and records the update time.
   * @param {string} hash New password hash (must be non-empty).
   * @param {Date} now Date/time of the update (must be later than the current passwordUpdatedAt).
   * @throws Error if the provided time is not later than the current passwordUpdatedAt.
   */
  changePasswordHash(hash: string, now: Date) {
    requireNonEmpty(hash)
    requireNonEmpty(now)

    if (this._passwordUpdatedAt && now <= this._passwordUpdatedAt) {
      throw new PasswordUpdateTimeError()
    }

    this._passwordUpdatedAt = now
    this._passwordHash = hash
  }
}
