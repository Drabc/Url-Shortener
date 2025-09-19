import { IUserRepository } from '@domain/repositories/user.repository.interface.js'
import { User } from '@domain/entities/user.js'
import { PgClient } from '@infrastructure/clients/pg-client.js'

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
   * @returns {Promise<User | null>} A User instance if found; otherwise null.
   */
  async findById(id: string): Promise<User | null> {
    const query = 'select * from app.users u where u.id = $1'
    const row = await this.client.findOne<UserRow>(query, [id])
    return this.createFromRow(row)
  }

  /**
   * Finds a user by their unique email address.
   * @param {string} email The user's email.
   * @returns {Promise<User | null>} A User instance if a matching email is found; otherwise null.
   */
  async findByEmail(email: string): Promise<User | null> {
    const query = 'select * from app.users u where u.email = $1'
    const row = await this.client.findOne<UserRow>(query, [email])
    return this.createFromRow(row)
  }

  /**
   * Persists a new user entity into the database.
   * @param {User} user The user domain entity to persist.
   * @returns {Promise<void>} Resolves when the user has been persisted.
   * @throws EntityAlreadyExistsError when the user already exists.
   */
  async save(user: User): Promise<void> {
    const query = `
      insert into app.users (first_name, last_name, email, password_hash, password_updated_at)
      values ($1, $2, $3, $4, $5)
      on conflict do nothing
    `

    await this.client.insertOrThrow(query, [
      user.firstName,
      user.lastName,
      user.email.value,
      user.passwordHash,
      user.passwordUpdatedAt,
    ])
  }

  /**
   * Creates a User domain entity from a database row.
   * @param {UserRow | null} row Database row returned from users table (or null).
   * @returns {User | null} Instantiated User or null if the provided row is null.
   */
  private createFromRow(row: UserRow | null): User | null {
    if (!row) return null

    return new User(
      row.id,
      row.first_name,
      row.last_name,
      row.email,
      row.password_hash,
      new Date(row.password_updated_at),
    )
  }
}
