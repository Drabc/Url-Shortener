import { customAlphabet } from 'nanoid'

import { IUrlRepository } from '../../domain/repositories/url-repository.interface.js'
import { NotFoundError } from '../../shared/errors/index.js'
import { ValidUrl } from '../../domain/values-objects/valid-url.js'
import { ShortUrl } from '../../domain/entities/short-url.js'
import { CodeExistsError } from '../../infrastructure/errors/code-exists.error.js'
import { MaxCodeGenerationAttemptsError } from '../errors/max-code-generation-attempts.error.js'

export class ShortenerService {
  private nanoid = customAlphabet(
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    10,
  )
  private readonly maxAttempts = 5

  constructor(
    private urlStorageClient: IUrlRepository,
    private baseUrl: string,
  ) {}

  async shortenUrl(originalUrl: string): Promise<string> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const code = this.nanoid()
      const candidate = new ShortUrl('', code, new ValidUrl(originalUrl))

      try {
        await this.urlStorageClient.save(candidate)
        return `${this.baseUrl}/${code}`
      } catch (error: unknown) {
        if (error instanceof CodeExistsError) {
          continue
        }
        throw error
      }
    }
    throw new MaxCodeGenerationAttemptsError(this.maxAttempts)
  }

  async resolveUrl(code: string): Promise<string> {
    const shortUrl = await this.urlStorageClient.findById(code)
    if (!shortUrl) {
      // TODO: Replace by an application error
      throw new NotFoundError(`Code ${code}`)
    }
    return shortUrl.url
  }
}
