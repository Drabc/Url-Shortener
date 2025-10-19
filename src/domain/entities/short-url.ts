import { ValidUrl } from '@domain/value-objects/valid-url.js'
import { BaseEntity } from '@domain/entities/base-entity.js'
import { InvalidValue } from '@domain/errors/index.js'
import { errorFactory } from '@shared/errors.js'
import { Err, Ok, Result } from '@shared/result.js'

/**
 * Represents a shortened URL entity.
 */
export class ShortUrl extends BaseEntity {
  /**
   * The original URL that this short URL points to.
   * @returns {string} The original URL.
   */
  public get url(): string {
    return this.originalUrl.value
  }

  /**
   * Identifier of the owning user, if this short url is user-owned.
   * Anonymous short urls will have this value undefined.
   * @returns {string | undefined} the user id or undefined
   */
  public get userId(): string | undefined {
    return this._userId
  }

  /**
   * Creates a ShortUrl owned by a user.
   * @param {string} id The unique identifier for the short url entity.
   * @param {string} code The short code representing the shortened url.
   * @param {ValidUrl} originalUrl The validated original URL to shorten.
   * @param {string} userId The unique identifier of the owning user.
   * @returns {Result<ShortUrl, InvalidValue>} Ok with ShortUrl or Err with InvalidValue when code is empty.
   */
  public static create(
    id: string,
    code: string,
    originalUrl: ValidUrl,
    userId?: string,
  ): Result<ShortUrl, InvalidValue> {
    if (!code) return Err(errorFactory.domain('InvalidValue', 'internal_error'))

    return Ok(new ShortUrl(id, code, originalUrl, userId))
  }

  private constructor(
    public readonly id: string,
    public readonly code: string,
    private originalUrl: ValidUrl,
    private readonly _userId?: string,
    isNew: boolean = true,
  ) {
    super(id, isNew)
  }
}
