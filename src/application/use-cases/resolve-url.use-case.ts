import { NotFoundError } from '@application/errors/not-found.error.js'
import { IShortUrlRepository } from '@domain/repositories/short-url.repository.interface.js'

/**
 * Use case responsible for resolving a short code to its original URL.
 * repo: Repository for storing and retrieving short URLs.
 */
export class ResolveUrl {
  constructor(private readonly repo: IShortUrlRepository) {}

  /**
   * Resolves a short code to its original URL.
   * @param {string} code - The short code to resolve.
   * @returns {Promise<string>} A promise that resolves to the original URL.
   * @throws {NotFoundError} Thrown if the code does not exist in the storage.
   */
  async resolveUrl(code: string): Promise<string> {
    const shortUrl = await this.repo.findByCode(code)
    if (!shortUrl) {
      throw new NotFoundError(`Code ${code}`)
    }
    return shortUrl.url
  }
}
