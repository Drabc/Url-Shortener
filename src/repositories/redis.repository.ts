import { Redis } from 'ioredis'
import { IUrlRepository } from './url-repository.interface.js'

export class RedisRepository implements IUrlRepository {
  private client: Redis

  constructor(client: Redis) {
    this.client = client
  }

  async findById(id: string): Promise<string | null> {
    return this.client.get(id)
  }

  async save(id: string, url: string): Promise<string> {
    await this.client.set(id, url)
    return id
  }
}
