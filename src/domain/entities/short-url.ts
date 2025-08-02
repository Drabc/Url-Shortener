import { InvalidCodeError } from '../errors/invalid-code.error.js'
import { ValidUrl } from '../values-objects/valid-url.js'

import { BaseEntity } from './base-entity.js'

/**
 * Represents a shortened URL entity.
 * @param {string} id - The unique identifier for the short URL. Defaults to an empty string.
 * @param {string} code - The unique code for the short URL.
 * @param {ValidUrl} originalUrl - The original URL that is being shortened.
 * @throws {InvalidCodeError} Thrown if the code is empty.
 */
export class ShortUrl extends BaseEntity {
  /**
   * The original URL that this short URL points to.
   * @returns {string} The original URL.
   */
  public get url(): string {
    return this.originalUrl.value
  }

  constructor(
    public readonly id: string,
    public readonly code: string,
    private originalUrl: ValidUrl,
  ) {
    if (!code) {
      throw new InvalidCodeError('Code must not be empty')
    }

    super(id)
  }
}
