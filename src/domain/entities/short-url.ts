import { InvalidCodeError } from '../errors/invalid-code.error.js'
import { ValidUrl } from '../values-objects/valid-url.js'

import { BaseEntity } from './base-entity.js'

export class ShortUrl extends BaseEntity {
  public get url() {
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
