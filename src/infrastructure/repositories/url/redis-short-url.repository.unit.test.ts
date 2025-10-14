import { Redis } from 'ioredis'

import { ShortUrl } from '@domain/entities/short-url.js'
import { RedisShortUrlRepository } from '@infrastructure/repositories/url/redis-short-url.repository.js'

describe('RedisShortUrlRepository', () => {
  const code: string = 'abc123'
  let repository: RedisShortUrlRepository
  let mockRedisClient: jest.Mocked<Redis>

  type Failure<T> = Exclude<T, { ok: true }>

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

      const result = await repository.findByCode(code)
      expect(mockRedisClient.get).toHaveBeenCalledWith(code)
      expect(result).toBeInstanceOf(ShortUrl)
    })

    it('should return null when the client does not find the code', async () => {
      mockRedisClient.get.mockResolvedValue(null)

      const result = await repository.findByCode(code)

      expect(mockRedisClient.get).toHaveBeenCalledWith(code)
      expect(result).toBeNull()
    })
  })

  describe('save()', () => {
    it('should save the ShortUrl using the Redis client with TTL', async () => {
      const shortUrl = { code, url: 'https://example.com', userId: undefined } as ShortUrl
      mockRedisClient.set.mockResolvedValue('OK') // Simulate successful save
      const res = await repository.save(shortUrl)
      expect(res.ok).toBe(true)
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        shortUrl.code,
        shortUrl.url,
        'EX',
        7 * 24 * 60 * 60, // 7 days in seconds
        'NX',
      )
    })

    it('should return DuplicateCode domain error if the code already exists', async () => {
      const shortUrl = { code, url: 'https://example.com', userId: undefined } as ShortUrl
      mockRedisClient.set.mockResolvedValue(null) // Simulate that the code already exists

      const res = await repository.save(shortUrl)
      expect(res.ok).toBe(false)
      const failure: Failure<typeof res> = res as Failure<typeof res>
      expect(failure.error.kind).toBe('domain')
      expect(failure.error.type).toBe('DuplicateCode')
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        shortUrl.code,
        shortUrl.url,
        'EX',
        7 * 24 * 60 * 60,
        'NX',
      )
    })

    it('should return UnableToSave domain error if attempting to save user-owned URL', async () => {
      const shortUrl = { code, url: 'https://example.com', userId: 'user123' } as ShortUrl

      const res = await repository.save(shortUrl)
      expect(res.ok).toBe(false)
      const failure: Failure<typeof res> = res as Failure<typeof res>
      expect(failure.error.kind).toBe('domain')
      expect(failure.error.type).toBe('UnableToSave')
      expect(mockRedisClient.set).not.toHaveBeenCalled()
    })
  })
})
