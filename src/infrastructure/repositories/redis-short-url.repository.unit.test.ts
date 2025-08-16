import { Redis } from 'ioredis'

import { ShortUrl } from '@domain/entities/short-url.js'
import { CodeExistsError } from '@infrastructure/errors/repository.error.js'
import { RedisShortUrlRepository } from '@infrastructure/repositories/redis-short-url.repository.js'

describe('RedisShortUrlRepository', () => {
  const code: string = 'abc123'
  let repository: RedisShortUrlRepository
  let mockRedisClient: jest.Mocked<Redis>

  beforeEach(() => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
    } as unknown as jest.Mocked<Redis>

    repository = new RedisShortUrlRepository(mockRedisClient)
  })

  describe('findById()', () => {
    it('should return a ShortUrl when the client finds the code', async () => {
      mockRedisClient.get.mockResolvedValue('https://example.com')

      const result = await repository.findById(code)
      expect(mockRedisClient.get).toHaveBeenCalledWith(code)
      expect(result).toBeInstanceOf(ShortUrl)
    })

    it('should return null when the client does not find the code', async () => {
      mockRedisClient.get.mockResolvedValue(null)

      const result = await repository.findById(code)

      expect(mockRedisClient.get).toHaveBeenCalledWith(code)
      expect(result).toBeNull()
    })
  })

  describe('save()', () => {
    it('should save the ShortUrl using the Redis client', async () => {
      const shortUrl = { code, url: 'https://example.com' } as ShortUrl
      mockRedisClient.set.mockResolvedValue('OK') // Simulate successful save
      await repository.save(shortUrl)
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        shortUrl.code,
        shortUrl.url,
        'NX',
      )
    })

    it('should return an error if the code already exists', async () => {
      const shortUrl = { code, url: 'https://example.com' } as ShortUrl
      mockRedisClient.set.mockResolvedValue(null) // Simulate that the code already exists

      await expect(repository.save(shortUrl)).rejects.toThrow(CodeExistsError)
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        shortUrl.code,
        shortUrl.url,
        'NX',
      )
    })
  })
})
