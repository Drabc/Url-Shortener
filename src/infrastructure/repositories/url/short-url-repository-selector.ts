import { IShortUrlRepository } from '@domain/repositories/short-url.repository.interface.js'
import { ShortUrl } from '@domain/entities/short-url.js'
import { AsyncResult } from '@shared/result.js'
import { CodeError } from '@domain/errors/repository.error.js'

/**
 * Repository selector that routes short URL operations based on authentication status.
 * Anonymous URLs (userId = undefined) are stored in Redis with TTL.
 * Authenticated URLs (userId provided) are stored in Postgres permanently.
 */
export class ShortUrlRepositorySelector implements IShortUrlRepository {
  constructor(
    private readonly redisRepository: IShortUrlRepository,
    private readonly postgresRepository: IShortUrlRepository,
  ) {}

  /**
   * Retrieves a short URL by its code, checking both Redis and Postgres.
   * @param {string} code - The unique code of the short URL to retrieve.
   * @returns {Promise<ShortUrl | null>} A promise that resolves to the ShortUrl entity or null if not found.
   */
  async findByCode(code: string): Promise<ShortUrl | null> {
    // Try Redis first (faster lookup for anonymous URLs)
    const redisResult = await this.redisRepository.findByCode(code)
    if (redisResult) {
      return redisResult
    }

    // If not found in Redis, try Postgres (authenticated URLs)
    return await this.postgresRepository.findByCode(code)
  }

  /**
   * Saves a ShortUrl entity to the appropriate repository based on userId.
   * Anonymous URLs (userId = undefined) go to Redis with TTL.
   * Authenticated URLs (userId provided) go to Postgres permanently.
   * @param {ShortUrl} shortUrl - The ShortUrl entity to save.
   * @returns {AsyncResult<void, CodeError>} A promise that resolves when the save operation is complete.
   */
  async save(shortUrl: ShortUrl): AsyncResult<void, CodeError> {
    if (shortUrl.userId === undefined) {
      // Anonymous URL - store in Redis with TTL
      return await this.redisRepository.save(shortUrl)
    } else {
      // Authenticated URL - store in Postgres permanently
      return await this.postgresRepository.save(shortUrl)
    }
  }
}
