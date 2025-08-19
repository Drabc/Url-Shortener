import { Pool } from 'pg'

import { ShortUrl } from '@domain/entities/short-url.js'
import { IUrlRepository } from '@domain/repositories/url-repository.interface.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
import {
  CodeExistsError,
  ImmutableCodeError,
} from '@infrastructure/errors/repository.error.js'

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
 * @param {Pool} pool - PostgreSQL connection pool
 */
export class PostgresShortUrlRepository implements IUrlRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Finds a ShortUrl entity by its unique identifier.
   * @param {string} code - the unique code of the short url
   * @returns {Promise<ShortUrl | null>} entity or null if not found
   */
  async findByCode(code: string): Promise<ShortUrl | null> {
    const sql = 'select id, code, original_url from urls where code = $1'
    const res = await this.pool.query<UrlRow>(sql, [code])

    if (res.rowCount === 0) {
      return null
    }

    const row = res.rows[0]
    return new ShortUrl(row.id, row.code, new ValidUrl(row.original_url))
  }

  /**
   * Saves a new ShortUrl entity.
   * Updates are not allowed for short codes.
   * @param {ShortUrl} code the short url domain entity
   * @returns {Promise<void>}
   * @throws {CodeExistsError} if a row with the same code already exists
   * @throws {ImmutableCodeError} if trying to save an already persisted entity
   */
  async save(code: ShortUrl): Promise<void> {
    if (code.isPersisted()) {
      throw new ImmutableCodeError()
    }

    const sql =
      'insert into urls (code, original_url, created_at, updated_at) values ($1, $2, now(), now())'

    try {
      await this.pool.query(sql, [code.code, code.url])
    } catch (err) {
      const e = err as { code?: string; detail?: string }
      if (e.code === '23505') {
        throw new CodeExistsError(`Code ${code.code} already exists`)
      }
      throw err
    }
  }
}
