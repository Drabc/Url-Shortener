import { ShortUrl } from '@domain/entities/short-url.js'
import { IShortUrlRepository } from '@domain/repositories/short-url.repository.interface.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
import { PgClient } from '@infrastructure/clients/pg-client.js'
import { AsyncResult, Err, Ok } from '@shared/result.js'
import { errorFactory } from '@shared/errors.js'
import { CodeError } from '@domain/errors/repository.error.js'

export type UrlRow = {
  id: string
  code: string
  original_url: string
  user_id: string | null
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
    const query = 'select id, code, original_url, user_id from app.short_urls where code = $1'
    const row = await this.client.findOne<UrlRow>(query, [code])

    if (!row) {
      return null
    }
    return new ShortUrl(
      row.id,
      row.code,
      new ValidUrl(row.original_url),
      row.user_id ?? undefined,
      false,
    )
  }

  /**
   * Saves a new ShortUrl entity.
   * Updates are not allowed for short codes.
   * @param {ShortUrl} code the short url domain entity
   * @returns {AsyncResult<void, CodeError>} void or error if the code is not new
   */
  async save(code: ShortUrl): AsyncResult<void, CodeError> {
    if (!code.isNew()) {
      return Err(errorFactory.domain('ImmutableCode'))
    }

    const sql =
      'insert into app.short_urls (code, original_url, user_id, created_at, updated_at) values ($1, $2, $3, now(), now())'

    const result = await this.client.insert(sql, [code.code, code.url, code.userId ?? null])

    return result.ok ? Ok(undefined) : Err(errorFactory.domain('UnableToSave'))
  }
}
