import { customAlphabet } from 'nanoid'

import { IUrlRepository } from '../repositories/url-repository.interface.js'
import { NotFoundError } from '../shared/errors/index.js'
import { ValidUrl } from '../domain/values-objects/valid-url.js'
import { ShortUrl } from '../domain/entities/short-url.js'

export class ShortenerService {
  private nanoid = customAlphabet(
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    10,
  )

  constructor(
    private urlStorageClient: IUrlRepository,
    private baseUrl: string,
  ) {}

  async shortenUrl(originalUrl: string): Promise<string> {
    // add retry
    const code = this.nanoid()
    const shortUrl = new ShortUrl('', code, new ValidUrl(originalUrl))
    await this.urlStorageClient.save(shortUrl)
    return `${this.baseUrl}/${code}`
  }

  async resolveUrl(id: string): Promise<string> {
    const shortUrl = await this.urlStorageClient.findById(id)
    if (!shortUrl) {
      throw new NotFoundError(`URL ${id}`)
    }
    return shortUrl.url
  }
}
