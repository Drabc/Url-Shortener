import { Redis } from 'ioredis'

import { ShortUrl } from '@domain/entities/short-url.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
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

  describe('findByCode()', () => {
    it('returns Ok(ShortUrl) when redis finds the code', async () => {
      mockRedisClient.get.mockResolvedValue('https://example.com')
      const res = await repository.findByCode(code)
      expect(mockRedisClient.get).toHaveBeenCalledWith(code)
      expect(res.ok).toBe(true)
      const success = res as typeof res & { ok: true }
      expect(success.value).toBeInstanceOf(ShortUrl)
      expect(success.value?.url).toBe('https://example.com')
    })

    it('returns Ok(null) when redis does not find the code', async () => {
      mockRedisClient.get.mockResolvedValue(null)
      const res = await repository.findByCode(code)
      expect(mockRedisClient.get).toHaveBeenCalledWith(code)
      expect(res.ok).toBe(true)
      const success = res as typeof res & { ok: true }
      expect(success.value).toBeNull()
    })
  })

  describe('save()', () => {
    it('saves anonymous ShortUrl using Redis with TTL', async () => {
      const validUrlRes = ValidUrl.create('https://example.com')
      expect(validUrlRes.ok).toBe(true)
      const shortRes = ShortUrl.create(
        'id-1',
        code,
        (validUrlRes as typeof validUrlRes & { ok: true }).value,
      )
      expect(shortRes.ok).toBe(true)
      const shortUrl = (shortRes as typeof shortRes & { ok: true }).value
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

    it('returns DuplicateCode when code already exists', async () => {
      const validUrlRes = ValidUrl.create('https://example.com')
      expect(validUrlRes.ok).toBe(true)
      const shortRes = ShortUrl.create(
        'id-2',
        code,
        (validUrlRes as typeof validUrlRes & { ok: true }).value,
      )
      expect(shortRes.ok).toBe(true)
      const shortUrl = (shortRes as typeof shortRes & { ok: true }).value
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

    it('returns UnableToSave when attempting to save user-owned URL', async () => {
      const validUrlRes = ValidUrl.create('https://example.com')
      expect(validUrlRes.ok).toBe(true)
      const shortRes = ShortUrl.create(
        'id-3',
        code,
        (validUrlRes as typeof validUrlRes & { ok: true }).value,
        'user123',
      )
      expect(shortRes.ok).toBe(true)
      const shortUrl = (shortRes as typeof shortRes & { ok: true }).value

      const res = await repository.save(shortUrl)
      expect(res.ok).toBe(false)
      const failure: Failure<typeof res> = res as Failure<typeof res>
      expect(failure.error.kind).toBe('domain')
      expect(failure.error.type).toBe('UnableToSave')
      expect(mockRedisClient.set).not.toHaveBeenCalled()
    })
  })
})
