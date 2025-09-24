import { EmptyValueError } from '@domain/errors/empty-value.error.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
import { BaseEntity } from '@domain/entities/base-entity.js'

/**
 * Represents a shortened URL entity.
 * @param {string} id - The unique identifier for the short URL. Defaults to an empty string.
 * @param {string} code - The unique code for the short URL.
 * @param {ValidUrl} originalUrl - The original URL that is being shortened.
 * @throws {EmptyValueError} Thrown if the code is empty.
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

  constructor(
    public readonly id: string,
    public readonly code: string,
    private originalUrl: ValidUrl,
    private readonly _userId?: string,
    isNew: boolean = true,
  ) {
    if (!code) {
      throw new EmptyValueError('Code must not be empty')
    }
    super(id, isNew)
  }
}
