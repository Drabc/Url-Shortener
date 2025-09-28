import { ShortUrl } from '@domain/entities/short-url.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
import { IShortUrlRepository } from '@domain/repositories/short-url.repository.interface.js'

import { ShortUrlRepositorySelector } from './short-url-repository-selector.js'

describe('ShortUrlRepositorySelector', () => {
  let selector: ShortUrlRepositorySelector
  let mockRedisRepository: jest.Mocked<IShortUrlRepository>
  let mockPostgresRepository: jest.Mocked<IShortUrlRepository>

  beforeEach(() => {
    mockRedisRepository = {
      findByCode: jest.fn(),
      save: jest.fn(),
    }

    mockPostgresRepository = {
      findByCode: jest.fn(),
      save: jest.fn(),
    }

    selector = new ShortUrlRepositorySelector(mockRedisRepository, mockPostgresRepository)
  })

  describe('findByCode()', () => {
    const code = 'abc123'

    it('should return result from Redis when found', async () => {
      const expectedShortUrl = new ShortUrl(
        'id1',
        code,
        new ValidUrl('https://example.com'),
        undefined,
        false,
      )
      mockRedisRepository.findByCode.mockResolvedValue(expectedShortUrl)

      const result = await selector.findByCode(code)

      expect(mockRedisRepository.findByCode).toHaveBeenCalledWith(code)
      expect(mockPostgresRepository.findByCode).not.toHaveBeenCalled()
      expect(result).toBe(expectedShortUrl)
    })

    it('should check Postgres when not found in Redis', async () => {
      const expectedShortUrl = new ShortUrl(
        'id2',
        code,
        new ValidUrl('https://example.com'),
        'user123',
        false,
      )
      mockRedisRepository.findByCode.mockResolvedValue(null)
      mockPostgresRepository.findByCode.mockResolvedValue(expectedShortUrl)

      const result = await selector.findByCode(code)

      expect(mockRedisRepository.findByCode).toHaveBeenCalledWith(code)
      expect(mockPostgresRepository.findByCode).toHaveBeenCalledWith(code)
      expect(result).toBe(expectedShortUrl)
    })

    it('should return null when not found in either repository', async () => {
      mockRedisRepository.findByCode.mockResolvedValue(null)
      mockPostgresRepository.findByCode.mockResolvedValue(null)

      const result = await selector.findByCode(code)

      expect(mockRedisRepository.findByCode).toHaveBeenCalledWith(code)
      expect(mockPostgresRepository.findByCode).toHaveBeenCalledWith(code)
      expect(result).toBeNull()
    })

    it('should handle Redis repository errors and still check Postgres', async () => {
      const expectedShortUrl = new ShortUrl(
        'id3',
        code,
        new ValidUrl('https://example.com'),
        'user456',
        false,
      )
      mockRedisRepository.findByCode.mockRejectedValue(new Error('Redis connection error'))
      mockPostgresRepository.findByCode.mockResolvedValue(expectedShortUrl)

      await expect(selector.findByCode(code)).rejects.toThrow('Redis connection error')
      expect(mockRedisRepository.findByCode).toHaveBeenCalledWith(code)
      expect(mockPostgresRepository.findByCode).not.toHaveBeenCalled()
    })
  })

  describe('save()', () => {
    it('should save anonymous URL (userId = undefined) to Redis repository', async () => {
      const anonymousUrl = new ShortUrl(
        'id4',
        'xyz789',
        new ValidUrl('https://anonymous.com'),
        undefined,
        true,
      )

      await selector.save(anonymousUrl)

      expect(mockRedisRepository.save).toHaveBeenCalledWith(anonymousUrl)
      expect(mockPostgresRepository.save).not.toHaveBeenCalled()
    })

    it('should save authenticated URL (userId provided) to Postgres repository', async () => {
      const authenticatedUrl = new ShortUrl(
        'id5',
        'def456',
        new ValidUrl('https://authenticated.com'),
        'user789',
        true,
      )

      await selector.save(authenticatedUrl)

      expect(mockPostgresRepository.save).toHaveBeenCalledWith(authenticatedUrl)
      expect(mockRedisRepository.save).not.toHaveBeenCalled()
    })

    it('should propagate Redis repository errors for anonymous URLs', async () => {
      const anonymousUrl = new ShortUrl(
        'id6',
        'error123',
        new ValidUrl('https://error.com'),
        undefined,
        true,
      )
      const redisError = new Error('Redis save failed')
      mockRedisRepository.save.mockRejectedValue(redisError)

      await expect(selector.save(anonymousUrl)).rejects.toThrow('Redis save failed')
      expect(mockRedisRepository.save).toHaveBeenCalledWith(anonymousUrl)
      expect(mockPostgresRepository.save).not.toHaveBeenCalled()
    })

    it('should propagate Postgres repository errors for authenticated URLs', async () => {
      const authenticatedUrl = new ShortUrl(
        'id7',
        'error456',
        new ValidUrl('https://error.com'),
        'user999',
        true,
      )
      const postgresError = new Error('Postgres save failed')
      mockPostgresRepository.save.mockRejectedValue(postgresError)

      await expect(selector.save(authenticatedUrl)).rejects.toThrow('Postgres save failed')
      expect(mockPostgresRepository.save).toHaveBeenCalledWith(authenticatedUrl)
      expect(mockRedisRepository.save).not.toHaveBeenCalled()
    })

    it('should handle edge case where userId is empty string (treated as authenticated)', async () => {
      const emptyUserIdUrl = new ShortUrl(
        'id8',
        'empty123',
        new ValidUrl('https://empty.com'),
        '',
        true,
      )

      await selector.save(emptyUserIdUrl)

      expect(mockPostgresRepository.save).toHaveBeenCalledWith(emptyUserIdUrl)
      expect(mockRedisRepository.save).not.toHaveBeenCalled()
    })
  })
})
