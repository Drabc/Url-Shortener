import { IShortUrlRepository } from '@domain/repositories/short-url.repository.interface.js'
import { AsyncResult, Err, Ok } from '@shared/result.js'
import { errorFactory } from '@shared/errors.js'
import { ResourceNotFoundError } from '@application/errors/index.js'
import { InvalidUrl } from '@domain/errors/index.js'

/**
 * Use case responsible for resolving a short code to its original URL.
 * repo: Repository for storing and retrieving short URLs.
 */
export class ResolveUrl {
  constructor(private readonly repo: IShortUrlRepository) {}

  /**
   * Resolves a short code to its original URL.
   * @param {string} code - The short code to resolve.
   * @returns {AsyncResult<string, ResourceNotFoundError>} A promise that resolves to the original URL.
   */
  async resolveUrl(code: string): AsyncResult<string, ResourceNotFoundError | InvalidUrl> {
    const result = await this.repo.findByCode(code)
    return result.andThen((code) => {
      if (!code) {
        return Err(
          errorFactory.app('ResourceNotFound', 'not_found', { cause: `Code ${code} not found` }),
        )
      }
      return Ok(code.url)
    })
  }
}
