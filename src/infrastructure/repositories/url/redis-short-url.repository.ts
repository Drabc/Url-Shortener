import { Redis } from 'ioredis'

import { ShortUrl } from '@domain/entities/short-url.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
import { IShortUrlRepository } from '@domain/repositories/short-url.repository.interface.js'
import { AsyncResult, Err, Ok } from '@shared/result.js'
import { CodeError } from '@domain/errors/repository.error.js'
import { errorFactory } from '@shared/errors.js'
import { InvalidUrl, InvalidValue } from '@domain/errors/index.js'

/**
 * Redis implementation of the URL repository interface for storing and retrieving short URLs.
 * Used for anonymous (temporary) short URLs with 7-day TTL.
 * @implements {IShortUrlRepository}
 * @param {Redis} client - The Redis client instance used for database operations.
 */
export class RedisShortUrlRepository implements IShortUrlRepository {
  private client: Redis
  private readonly ttlSeconds: number = 7 * 24 * 60 * 60 // 7 days in seconds

  constructor(client: Redis) {
    this.client = client
  }

  /**
   * Retrieves a short URL by its code.
   * @param {string} code - The unique code of the short URL to retrieve.
   * @returns {Promise<ShortUrl | null>} A promise that resolves to the ShortUrl entity or null if not found.
   */
  async findByCode(code: string): AsyncResult<ShortUrl | null, InvalidValue | InvalidUrl> {
    const url = await this.client.get(code)
    if (!url) return Ok(null)

    return ValidUrl.create(url)
      .andThen((validUrl) => ShortUrl.create(code, code, validUrl))
      .andThen((mappedCode) => Ok(mappedCode))
  }

  /**
   * Saves a ShortUrl entity to the Redis database with 7-day TTL.
   * Only accepts anonymous URLs (userId must be undefined).
   * @param {ShortUrl} shortUrl - The ShortUrl entity to save.
   * @returns {AsyncResult<void, CodeError>} Code Error when not able to save code.
   */
  async save(shortUrl: ShortUrl): AsyncResult<void, CodeError> {
    if (shortUrl.userId !== undefined) {
      return Err(
        errorFactory.domain('UnableToSave', 'validation', {
          message: 'Redis repository only accepts anonymous URLs (userId must be undefined)',
        }),
      )
    }

    const response = await this.client.set(shortUrl.code, shortUrl.url, 'EX', this.ttlSeconds, 'NX')
    return !response ? Err(errorFactory.domain('DuplicateCode', 'conflict')) : Ok(undefined)
  }
}
