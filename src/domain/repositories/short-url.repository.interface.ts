import { ShortUrl } from '@domain/entities/short-url.js'
import { InvalidUrl, InvalidValue } from '@domain/errors/index.js'
import { CodeError } from '@domain/errors/repository.error.js'
import { AsyncResult } from '@shared/result.js'

export interface IShortUrlRepository {
  /**
   * Persists a short url
   * @param {ShortUrl} code The short url to save
   * @returns {AsyncResult<void, CodeError>} void or CodeError
   */
  save(code: ShortUrl): AsyncResult<void, CodeError>
  findByCode(code: string): AsyncResult<ShortUrl | null, InvalidValue | InvalidUrl>
}
