import { requireNonEmpty } from '@domain/guards.js'
import { BaseEntity } from '@domain/entities/base-entity.js'
import { Email } from '@domain/value-objects/email.js'
import { all, Err, Ok, Result } from '@shared/result.js'
import { DomainValidationError, InvalidEmail } from '@domain/errors/index.js'
import { errorFactory } from '@shared/errors.js'

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
  /**
   * Gets the user's first name.
   * @returns {string} First name.
   */
  get firstName(): string {
    return this._firstName
  }

  /**
   * Gets the user's last name.
   * @returns {string} Last name.
   */
  get lastName(): string {
    return this._lastName
  }

  /**
   * Gets the user's email value object.
   * @returns {Email} Email.
   */
  get email(): Email {
    return this._email
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

  /**
   * Creates a new User entity after validating required fields.
   * @param {string} id User identifier.
   * @param {string} firstName First name (non-empty).
   * @param {string} lastName Last name (non-empty).
   * @param {string} email Email address (non-empty).
   * @param {string} passwordHash Password hash (non-empty).
   * @param {Date} now Current time used for passwordUpdatedAt.
   * @returns {Result<User, DomainValidationError>} Result containing the User or validation error.
   */
  static create(
    id: string,
    firstName: string,
    lastName: string,
    email: string | Email,
    passwordHash: string,
    now: Date,
  ): Result<User, DomainValidationError> {
    return all(requireNonEmpty(firstName), requireNonEmpty(email), requireNonEmpty(passwordHash))
      .andThen(() => (typeof email === 'string' ? Email.create(email) : Ok(email)))
      .andThen((normalizedEmail) =>
        Ok(new User(id, firstName, lastName, normalizedEmail, passwordHash, now)),
      )
  }

  private constructor(
    id: string,
    private _firstName: string,
    private _lastName: string,
    private _email: Email,
    private _passwordHash: string,
    private _passwordUpdatedAt: Date,
  ) {
    super(id)
  }

  /**
   * Updates the user's first name after non-empty validation.
   * @param {string} value New first name.
   * @returns {Result<void, DomainValidationError>} Err if value empty.
   */
  public updateFirstName(value: string): Result<void, DomainValidationError> {
    return requireNonEmpty(value).andThen(() => {
      this._firstName = value
      return Ok(undefined)
    })
  }

  /**
   * Updates the user's last name after non-empty validation.
   * @param {string} value New last name.
   * @returns {Result<void, DomainValidationError>} Err if value empty.
   */
  public updateLastName(value: string): Result<void, DomainValidationError> {
    return requireNonEmpty(value).andThen(() => {
      this._lastName = value
      return Ok(undefined)
    })
  }

  /**
   * Updates the user's email.
   * @param {Email | string} value Email value object or raw string.
   * @returns {Result<void, InvalidEmail>} Err if empty string.
   */
  public updateEmail(value: Email | string): Result<void, InvalidEmail> {
    if (typeof value === 'string') {
      Email.create(value).tap((email) => {
        value = email
      })
    }

    this._email = value as Email

    return Ok(undefined)
  }

  /**
   * Updates the user's password hash and records the update time.
   * @param {string} hash New password hash (must be non-empty).
   * @param {Date} now Date/time of the update (must be later than the current passwordUpdatedAt).
   * @returns {Result<void, DomainValidationError>} Validation error if any
   */
  changePasswordHash(hash: string, now: Date): Result<void, DomainValidationError> {
    return all(requireNonEmpty(hash), requireNonEmpty(now)).andThen(() => {
      if (this._passwordUpdatedAt && now <= this._passwordUpdatedAt) {
        return Err(
          errorFactory.domain('InvalidPasswordTime', 'internal_error', {
            cause: 'New password update time must be later than the current one',
          }),
        )
      }
      this._passwordUpdatedAt = now
      this._passwordHash = hash
      return Ok(undefined)
    })
  }
}
