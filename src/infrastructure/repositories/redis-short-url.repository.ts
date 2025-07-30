import { Redis } from 'ioredis'

import { ShortUrl } from '../../domain/entities/short-url.js'
import { ValidUrl } from '../../domain/values-objects/valid-url.js'
import { IUrlRepository } from '../../domain/repositories/url-repository.interface.js'
import { CodeExistsError } from '../errors/code-exists.error.js'

export class RedisShortUrlRepository implements IUrlRepository {
  private client: Redis

  constructor(client: Redis) {
    this.client = client
  }

  async findById(code: string): Promise<ShortUrl | null> {
    const url = await this.client.get(code)
    if (!url) return null
    // Move to factory when more persistent objects are added
    return new ShortUrl(code, code, new ValidUrl(url))
  }

  async save(shortUrl: ShortUrl): Promise<void> {
    const response = await this.client.set(shortUrl.code, shortUrl.url, 'NX')
    if (!response) {
      throw new CodeExistsError(
        `Short URL code "${shortUrl.code}" already exists.`,
      )
    }
  }
}
