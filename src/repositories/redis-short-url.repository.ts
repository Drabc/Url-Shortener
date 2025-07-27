import { Redis } from 'ioredis'

import { ShortUrl } from '../domain/entities/short-url.js'
import { ValidUrl } from '../domain/values-objects/valid-url.js'

import { IUrlRepository } from './url-repository.interface.js'

export class RedisShortUrlRepository implements IUrlRepository {
  private client: Redis

  constructor(client: Redis) {
    this.client = client
  }

  async findById(id: string): Promise<ShortUrl | null> {
    const url = await this.client.get(id)
    if (!url) return null
    // Move to factory when more persistent objects are added
    return new ShortUrl(id, id, new ValidUrl(url))
  }

  async save(shortUrl: ShortUrl): Promise<void> {
    await this.client.set(shortUrl.code, shortUrl.url)
  }
}
