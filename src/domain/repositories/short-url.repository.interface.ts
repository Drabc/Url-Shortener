import { ShortUrl } from '@domain/entities/short-url.js'
import { CodeExistsError } from '@infrastructure/errors/repository.error.js'

export interface IShortUrlRepository {
  /**
   * Persists a short url
   * @param {ShortUrl} code The short url to save
   * @throws {CodeExistsError} if trying to save a code that is already in the persistence mechanism
   */
  save(code: ShortUrl): Promise<void>
  findByCode(code: string): Promise<ShortUrl | null>
}
