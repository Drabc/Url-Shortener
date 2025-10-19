import { IUserRepository } from '@domain/repositories/user.repository.interface.js'
import { User } from '@domain/entities/user.js'
import { PgClient } from '@infrastructure/clients/pg-client.js'
import { AsyncResult, Err, Ok, Result } from '@shared/result.js'
import { errorFactory } from '@shared/errors.js'
import { SaveUserError } from '@domain/errors/repository.error.js'
import { DomainValidationError } from '@domain/errors/index.js'

export type UserRow = {
  id: string
  first_name: string
  last_name: string
  email: string
  password_hash: string
  password_updated_at: string
}

/**
 * Repository for interacting with users stored in PostgreSQL.
 * @param {PgClient} client Postgres client wrapper.
 */
export class PostgresUserRepository implements IUserRepository {
  constructor(private client: PgClient) {}

  /**
   * Finds a user by its unique identifier.
   * @param {string} id The user ID (UUID).
   * @returns {AsyncResult<User | null, DomainValidationError>} A User instance if found; otherwise null.
   */
  async findById(id: string): AsyncResult<User | null, DomainValidationError> {
    const query = 'select * from app.users u where u.id = $1'
    const row = await this.client.findOne<UserRow>(query, [id])
    return this.createFromRow(row)
  }

  /**
   * Finds a user by their unique email address.
   * @param {string} email The user's email.
   * @returns {AsyncResult<User | null, DomainValidationError>} A User instance if a matching email is found; otherwise null.
   */
  async findByEmail(email: string): AsyncResult<User | null, DomainValidationError> {
    const query = 'select * from app.users u where u.email = $1'
    const row = await this.client.findOne<UserRow>(query, [email])
    return this.createFromRow(row)
  }

  /**
   * Persists a new user entity into the database.
   * @param {User} user The user domain entity to persist.
   * @returns {AsyncResult<void, SaveUserError>} Resolves when the user has been persisted.
   */
  async save(user: User): AsyncResult<void, SaveUserError> {
    const query = `
      insert into app.users (first_name, last_name, email, password_hash, password_updated_at)
      values ($1, $2, $3, $4, $5)
      on conflict do nothing
    `

    const result = await this.client.insert(query, [
      user.firstName,
      user.lastName,
      user.email.value,
      user.passwordHash,
      user.passwordUpdatedAt,
    ])

    if (!result.ok) {
      return result.error.category === 'duplicate'
        ? Err(errorFactory.domain('DuplicateUser', 'duplicate', { cause: result.error.cause }))
        : Err(errorFactory.domain('UnableToSave', 'unknown', { cause: result.error.cause }))
    }

    return Ok(undefined)
  }

  /**
   * Creates a User domain entity from a database row.
   * @param {UserRow | null} row Database row returned from users table (or null).
   * @returns {Result<User | null, DomainValidationError>} Instantiated User or null if the provided row is null.
   */
  private createFromRow(row: UserRow | null): Result<User | null, DomainValidationError> {
    if (!row) return Ok(null)

    return User.create(
      row.id,
      row.first_name,
      row.last_name,
      row.email,
      row.password_hash,
      new Date(row.password_updated_at),
    )
  }
}
