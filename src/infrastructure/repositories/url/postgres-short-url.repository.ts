import { ShortUrl } from '@domain/entities/short-url.js'
import { IShortUrlRepository } from '@domain/repositories/short-url.repository.interface.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
import {
  EntityAlreadyExistsError,
  ImmutableCodeError,
} from '@infrastructure/errors/repository.error.js'
import { PgClient } from '@infrastructure/clients/pg-client.js'

export type UrlRow = {
  id: string
  code: string
  original_url: string
  created_at: Date
  updated_at: Date
}

/**
 * Repository implementation for managing ShortUrl entities in PostgreSQL.
 * Expects a table "urls" with columns:
 *   id uuid primary key,
 *   code text unique not null,
 *   original_url text not null,
 *   created_at timestamptz not null default now(),
 *   updated_at timestamptz not null default now()
 * @param {PgClient} client - Postgres client
 */
export class PostgresShortUrlRepository implements IShortUrlRepository {
  constructor(private readonly client: PgClient) {}

  /**
   * Finds a ShortUrl entity by its unique identifier.
   * @param {string} code - the unique code of the short url
   * @returns {Promise<ShortUrl | null>} entity or null if not found
   */
  async findByCode(code: string): Promise<ShortUrl | null> {
    const query = 'select id, code, original_url from app.short_urls where code = $1'
    const row = await this.client.findOne<UrlRow>(query, [code])

    if (!row) {
      return null
    }

    return new ShortUrl(row.id, row.code, new ValidUrl(row.original_url))
  }

  /**
   * Saves a new ShortUrl entity.
   * Updates are not allowed for short codes.
   * @param {ShortUrl} code the short url domain entity
   * @returns {Promise<void>}
   * @throws {EntityAlreadyExistsError} if a row with the same code already exists
   * @throws {ImmutableCodeError} if trying to save an already persisted entity
   */
  async save(code: ShortUrl): Promise<void> {
    if (code.isPersisted()) {
      throw new ImmutableCodeError()
    }

    const sql =
      'insert into app.short_urls (code, original_url, created_at, updated_at) values ($1, $2, now(), now())'

    await this.client.insertOrThrow(sql, [code.code, code.url])
  }
}
