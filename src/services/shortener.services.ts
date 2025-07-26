import { customAlphabet } from 'nanoid'

import { IUrlRepository } from '../repositories/url-repository.interface.js'
import { NotFoundError } from '../shared/errors/index.js'

export class ShortenerService {
  private nanoid = customAlphabet(
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    10,
  )
  private urlStorageClient: IUrlRepository

  constructor(urlStorageClient: IUrlRepository) {
    this.urlStorageClient = urlStorageClient
  }

  async shortenUrl(originalUrl: string): Promise<string> {
    // add retry
    const shortId = this.nanoid()
    await this.urlStorageClient.save(shortId, originalUrl)
    return shortId
  }

  async resolveUrl(id: string): Promise<string> {
    const url = await this.urlStorageClient.findById(id)
    if (!url) {
      throw new NotFoundError(`URL ${id}`)
    }
    return url
  }
}
