import { customAlphabet } from 'nanoid'

import { IShortUrlRepository } from '@domain/repositories/short-url.repository.interface.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
import { ShortUrl } from '@domain/entities/short-url.js'
import { AsyncResult, Err, Ok } from '@shared/result.js'
import { ShortenError } from '@application/errors/index.js'
import { errorFactory } from '@shared/errors.js'
import { InvalidValue } from '@domain/errors/index.js'

/**
 * Use case responsible for generating and persisting a short URL.
 * baseUrl: The base URL for the shortened links.
 * repo: Repository for storing and retrieving short URLs.
 */
export class ShortenUrl {
  private nanoid = customAlphabet(
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    10,
  )
  private readonly maxAttempts = 5

  constructor(
    private readonly repo: IShortUrlRepository,
    private readonly baseUrl: string,
  ) {}

  /**
   * Attempts to generate and store a unique short code for the given URL, retrying on collisions.
   * @param {string} originalUrl - The full URL to shorten. Must be a valid URL string.
   * @param {string | undefined} userId - Optional owner user id. When provided, the short url will be associated with this user.
   * @returns {AsyncResult<string, ShortenError>} A promise that resolves to the full shortened URL (including base URL and code).
   */
  async shortenUrl(
    originalUrl: string,
    userId?: string,
  ): AsyncResult<string, ShortenError | InvalidValue> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const code = this.nanoid()

      const codeResult = await ValidUrl.create(originalUrl)
        .andThen((validUrl) => ShortUrl.create('', code, validUrl, userId))
        .andThenAsync((validCode) => this.repo.save(validCode))

      if (!codeResult.ok) {
        if (codeResult.error.type === 'DuplicateCode') continue
        return Err(codeResult.error as ShortenError | InvalidValue)
      }

      return Ok(`${this.baseUrl}/${code}`)
    }

    return Err(errorFactory.app('MaxCodeGenerationAttemptsError', 'internal_error'))
  }
}
