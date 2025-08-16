import { customAlphabet } from 'nanoid'

import { NotFoundError } from '@presentation/errors/not-found.error.js'
import { CodeExistsError } from '@infrastructure/errors/repository.error.js'
import { IUrlRepository } from '@domain/repositories/url-repository.interface.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
import { ShortUrl } from '@domain/entities/short-url.js'
import { MaxCodeGenerationAttemptsError } from '@application/errors/max-code-generation-attempts.error.js'

/**
 * Service for URL shortening and resolution.
 * @param {IUrlRepository} urlStorageClient - Repository for storing and retrieving short URLs.
 * @param {string} baseUrl - The base URL for the shortened links.
 */
export class ShortenerService {
  private nanoid = customAlphabet(
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    10,
  )
  private readonly maxAttempts = 5

  constructor(
    private urlStorageClient: IUrlRepository,
    private baseUrl: string,
  ) {}

  /**
   * Attempts to generate and store a unique short code for the given URL, retrying on collisions.
   * @param {string} originalUrl - The full URL to shorten. Must be a valid URL string.
   * @returns {Promise<string>} A promise that resolves to the full shortened URL (including base URL and code).
   * @throws {MaxCodeGenerationAttemptsError}
   *   Thrown if a unique code could not be generated within the configured maximum attempts.
   * @throws {Error}
   *   Re-throws any unexpected errors from the storage client (other than code-collision errors).
   */
  async shortenUrl(originalUrl: string): Promise<string> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const code = this.nanoid()
      const candidate = new ShortUrl('', code, new ValidUrl(originalUrl))

      try {
        await this.urlStorageClient.save(candidate)
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

  /**
   * Resolves a short code to its original URL.
   * @param {string} code - The short code to resolve.
   * @returns {Promise<string>} A promise that resolves to the original URL.
   * @throws {NotFoundError}
   *   Thrown if the code does not exist in the storage.
   */
  async resolveUrl(code: string): Promise<string> {
    const shortUrl = await this.urlStorageClient.findById(code)
    if (!shortUrl) {
      // TODO: Replace by an application error
      throw new NotFoundError(`Code ${code}`)
    }
    return shortUrl.url
  }
}
