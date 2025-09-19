import { customAlphabet } from 'nanoid'

import { CodeExistsError } from '@infrastructure/errors/repository.error.js'
import { IShortUrlRepository } from '@domain/repositories/short-url.repository.interface.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
import { ShortUrl } from '@domain/entities/short-url.js'
import { MaxCodeGenerationAttemptsError } from '@application/errors/max-code-generation-attempts.error.js'

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
   * @returns {Promise<string>} A promise that resolves to the full shortened URL (including base URL and code).
   * @throws {MaxCodeGenerationAttemptsError} Thrown if a unique code could not be generated within the configured maximum attempts.
   * @throws {Error} Re-throws any unexpected errors from the storage client (other than code-collision errors).
   */
  async shortenUrl(originalUrl: string): Promise<string> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const code = this.nanoid()
      const candidate = new ShortUrl('', code, new ValidUrl(originalUrl))

      try {
        await this.repo.save(candidate)
        return `${this.baseUrl}/${code}`
      } catch (error: unknown) {
        if (error instanceof CodeExistsError) {
          continue
        }
        throw error
      }
    }
    throw new MaxCodeGenerationAttemptsError(this.maxAttempts)
  }
}
