import { ShortUrl } from '@domain/entities/short-url.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
import { IShortUrlRepository } from '@domain/repositories/short-url.repository.interface.js'
import { errorFactory } from '@shared/errors.js'
import { Ok, Err } from '@shared/result.js'

import { ShortUrlRepositorySelector } from './short-url-repository-selector.js'

type Success<T> = T & { ok: true }
type Failure<T> = Exclude<T, { ok: true }>

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

    it('returns Ok(ShortUrl) from Redis when found', async () => {
      const urlRes = ValidUrl.create('https://example.com')
      expect(urlRes.ok).toBe(true)
      const entityRes = ShortUrl.create('id1', code, (urlRes as Success<typeof urlRes>).value)
      expect(entityRes.ok).toBe(true)
      mockRedisRepository.findByCode.mockResolvedValue(entityRes)

      const res = await selector.findByCode(code)
      expect(mockRedisRepository.findByCode).toHaveBeenCalledWith(code)
      expect(mockPostgresRepository.findByCode).not.toHaveBeenCalled()
      expect(res.ok).toBe(true)
      const success = res as Success<typeof res>
      expect(success.value!.code).toBe(code)
    })

    it('queries Postgres when Redis returns Ok(null)', async () => {
      mockRedisRepository.findByCode.mockResolvedValue(Ok(null))
      const urlRes = ValidUrl.create('https://example.com')
      expect(urlRes.ok).toBe(true)
      const entityRes = ShortUrl.create(
        'id2',
        code,
        (urlRes as Success<typeof urlRes>).value,
        'user123',
      )
      expect(entityRes.ok).toBe(true)
      mockPostgresRepository.findByCode.mockResolvedValue(entityRes)

      const res = await selector.findByCode(code)
      expect(mockRedisRepository.findByCode).toHaveBeenCalledWith(code)
      expect(mockPostgresRepository.findByCode).toHaveBeenCalledWith(code)
      expect(res.ok).toBe(true)
      const success = res as Success<typeof res>
      expect(success.value!.userId).toBe('user123')
    })

    it('returns Ok(null) when not found in either repository', async () => {
      mockRedisRepository.findByCode.mockResolvedValue(Ok(null))
      mockPostgresRepository.findByCode.mockResolvedValue(Ok(null))
      const res = await selector.findByCode(code)
      expect(mockRedisRepository.findByCode).toHaveBeenCalledWith(code)
      expect(mockPostgresRepository.findByCode).toHaveBeenCalledWith(code)
      expect(res.ok).toBe(true)
      expect(res.ok && res.value).toBeNull()
    })

    it('propagates Redis Err without querying Postgres', async () => {
      const err = Err(errorFactory.domain('InvalidValue', 'validation'))
      mockRedisRepository.findByCode.mockResolvedValue(err)
      const res = await selector.findByCode(code)
      expect(mockRedisRepository.findByCode).toHaveBeenCalledWith(code)
      expect(mockPostgresRepository.findByCode).not.toHaveBeenCalled()
      expect(res.ok).toBe(false)
      const failure = res as Failure<typeof res>
      expect(failure.error.type).toBe('InvalidValue')
    })
  })

  describe('save()', () => {
    it('saves anonymous URL (userId undefined) to Redis', async () => {
      const urlRes = ValidUrl.create('https://anonymous.com')
      expect(urlRes.ok).toBe(true)
      const entityRes = ShortUrl.create('id4', 'xyz789', (urlRes as Success<typeof urlRes>).value)
      expect(entityRes.ok).toBe(true)
      const entity = (entityRes as Success<typeof entityRes>).value
      mockRedisRepository.save.mockResolvedValue(Ok(undefined))
      const res = await selector.save(entity)
      expect(mockRedisRepository.save).toHaveBeenCalledWith(entity)
      expect(mockPostgresRepository.save).not.toHaveBeenCalled()
      expect(res.ok).toBe(true)
    })

    it('saves authenticated URL (userId provided) to Postgres', async () => {
      const urlRes = ValidUrl.create('https://authenticated.com')
      expect(urlRes.ok).toBe(true)
      const entityRes = ShortUrl.create(
        'id5',
        'def456',
        (urlRes as Success<typeof urlRes>).value,
        'user789',
      )
      expect(entityRes.ok).toBe(true)
      const entity = (entityRes as Success<typeof entityRes>).value
      mockPostgresRepository.save.mockResolvedValue(Ok(undefined))
      const res = await selector.save(entity)
      expect(mockPostgresRepository.save).toHaveBeenCalledWith(entity)
      expect(mockRedisRepository.save).not.toHaveBeenCalled()
      expect(res.ok).toBe(true)
    })

    it('propagates Redis Err for anonymous URLs', async () => {
      const urlRes = ValidUrl.create('https://error.com')
      expect(urlRes.ok).toBe(true)
      const entityRes = ShortUrl.create('id6', 'error123', (urlRes as Success<typeof urlRes>).value)
      expect(entityRes.ok).toBe(true)
      const entity = (entityRes as Success<typeof entityRes>).value
      const failure = Err(errorFactory.domain('UnableToSave', 'internal_error'))
      mockRedisRepository.save.mockResolvedValue(failure)
      const res = await selector.save(entity)
      expect(mockRedisRepository.save).toHaveBeenCalledWith(entity)
      expect(mockPostgresRepository.save).not.toHaveBeenCalled()
      expect(res.ok).toBe(false)
      const fail = res as Failure<typeof res>
      expect(fail.error.type).toBe('UnableToSave')
    })

    it('propagates Postgres Err for authenticated URLs', async () => {
      const urlRes = ValidUrl.create('https://error.com')
      expect(urlRes.ok).toBe(true)
      const entityRes = ShortUrl.create(
        'id7',
        'error456',
        (urlRes as Success<typeof urlRes>).value,
        'user999',
      )
      expect(entityRes.ok).toBe(true)
      const entity = (entityRes as Success<typeof entityRes>).value
      const failure = Err(errorFactory.domain('UnableToSave', 'internal_error'))
      mockPostgresRepository.save.mockResolvedValue(failure)
      const res = await selector.save(entity)
      expect(mockPostgresRepository.save).toHaveBeenCalledWith(entity)
      expect(mockRedisRepository.save).not.toHaveBeenCalled()
      expect(res.ok).toBe(false)
      const fail = res as Failure<typeof res>
      expect(fail.error.type).toBe('UnableToSave')
    })

    it('treats empty string userId as authenticated (saved to Postgres)', async () => {
      const urlRes = ValidUrl.create('https://empty.com')
      expect(urlRes.ok).toBe(true)
      const entityRes = ShortUrl.create(
        'id8',
        'empty123',
        (urlRes as Success<typeof urlRes>).value,
        '',
      )
      expect(entityRes.ok).toBe(true)
      const entity = (entityRes as Success<typeof entityRes>).value
      mockPostgresRepository.save.mockResolvedValue(Ok(undefined))
      const res = await selector.save(entity)
      expect(mockPostgresRepository.save).toHaveBeenCalledWith(entity)
      expect(mockRedisRepository.save).not.toHaveBeenCalled()
      expect(res.ok).toBe(true)
    })
  })
})
