import { ShortUrl } from '@domain/entities/short-url.js'
import { CodeExistsError } from '@infrastructure/errors/repository.error.js'
import { IUrlRepository } from '@domain/repositories/url-repository.interface.js'
import { NotFoundError } from '@presentation/errors/not-found.error.js'
import { MaxCodeGenerationAttemptsError } from '@application/errors/max-code-generation-attempts.error.js'
import { ShortenerService } from '@application/services/shortener.service.js'

const nanoid: string = 'abc123'
// Needs to be prefix with mock to denote it is lazily evaluated
const mockNanoid: jest.Mock = jest.fn(() => nanoid)

jest.mock('nanoid', () => ({
  customAlphabet: jest.fn(() => mockNanoid),
}))

describe('ShortenerService', () => {
  const baseUrl: string = 'http://short.url'
  const expectedShortUrl: string = `${baseUrl}/${nanoid}`
  const url = 'https://example.com'
  let service: ShortenerService
  let mockUrlStorageClient: jest.Mocked<IUrlRepository>

  beforeEach(() => {
    jest.clearAllMocks()
    mockUrlStorageClient = {
      findById: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<IUrlRepository>
    service = new ShortenerService(mockUrlStorageClient, baseUrl)
  })

  describe('shortenUrl()', () => {
    it('should return a shorten url', async () => {
      const shortenUrl = await service.shortenUrl(url)
      expect(shortenUrl).toEqual(expectedShortUrl)
    })

    it('should re-generate a code if it already exists', async () => {
      mockUrlStorageClient.save
        .mockRejectedValueOnce(new CodeExistsError(nanoid))
        .mockResolvedValueOnce(undefined)
      const shortenUrl = await service.shortenUrl(url)

      expect(shortenUrl).toEqual(expectedShortUrl)
      expect(mockNanoid).toHaveBeenCalledTimes(2)
      expect(mockUrlStorageClient.save).toHaveBeenNthCalledWith(
        1,
        expect.any(ShortUrl),
      )
      expect(mockUrlStorageClient.save).toHaveBeenNthCalledWith(
        2,
        expect.any(ShortUrl),
      )
    })

    it('should throw MaxCodeGenerationAttemptsError after max attempts', async () => {
      mockUrlStorageClient.save.mockRejectedValue(new CodeExistsError(nanoid))
      await expect(service.shortenUrl(url)).rejects.toThrow(
        MaxCodeGenerationAttemptsError,
      )
    })
  })

  describe('resolveUrl()', () => {
    it('should return the original url when a code is found', async () => {
      const shortUrl = {
        code: nanoid,
        url,
      } as jest.Mocked<ShortUrl>
      mockUrlStorageClient.findById.mockResolvedValue(shortUrl)
      const resolvedUrl = await service.resolveUrl(nanoid)

      expect(resolvedUrl).toEqual(url)
      expect(mockUrlStorageClient.findById).toHaveBeenCalledWith(nanoid)
    })

    it('should throw NotFoundError when code is not found', async () => {
      mockUrlStorageClient.findById.mockResolvedValue(null)
      await expect(service.resolveUrl(nanoid)).rejects.toThrow(NotFoundError)
      expect(mockUrlStorageClient.findById).toHaveBeenCalledWith(nanoid)
    })
  })
})
