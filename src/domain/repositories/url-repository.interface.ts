import { ShortUrl } from '@domain/entities/short-url.js'
import { CodeExistsError } from '@infrastructure/errors/repository.error.js'

export interface IUrlRepository {
  /**
   * Persists a short url
   * @param {ShortUrl} entity The short url to save
   * @throws {CodeExistsError} if trying to save a code that is already in the persistence mechanism
   */
  save(entity: ShortUrl): Promise<void>
  findById(id: string): Promise<ShortUrl | null>
}
