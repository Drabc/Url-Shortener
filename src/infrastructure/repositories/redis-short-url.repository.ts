import { Redis } from 'ioredis'

import { ShortUrl } from '@domain/entities/short-url.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
import { IUrlRepository } from '@domain/repositories/url-repository.interface.js'
import { CodeExistsError } from '@infrastructure/errors/repository.error.js'

/**
 * Redis implementation of the URL repository interface for storing and retrieving short URLs.
 * @implements {IUrlRepository}
 * @param {Redis} client - The Redis client instance used for database operations.
 */
export class RedisShortUrlRepository implements IUrlRepository {
  private client: Redis

  constructor(client: Redis) {
    this.client = client
  }

  /**
   * Retrieves a short URL by its code.
   * @param {string} code - The unique code of the short URL to retrieve.
   * @returns {Promise<ShortUrl | null>} A promise that resolves to the ShortUrl entity or null if not found.
   */
  async findById(code: string): Promise<ShortUrl | null> {
    const url = await this.client.get(code)
    if (!url) return null
    // Move to factory when more persistent objects are added
    return new ShortUrl(code, code, new ValidUrl(url))
  }

  /**
   * Saves a ShortUrl entity to the Redis database.
   * @param {ShortUrl} shortUrl - The ShortUrl entity to save.
   * @returns {Promise<void>} A promise that resolves when the save operation is complete.
   * @throws {CodeExistsError} Thrown if the short URL code already exists in the database.
   */
  async save(shortUrl: ShortUrl): Promise<void> {
    const response = await this.client.set(shortUrl.code, shortUrl.url, 'NX')
    if (!response) {
      throw new CodeExistsError(
        `Short URL code "${shortUrl.code}" already exists.`,
      )
    }
  }
}
