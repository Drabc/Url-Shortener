import { ShortenUrl } from '@application/use-cases/shorten-url.use-case.js'
import { IShortUrlRepository } from '@domain/repositories/short-url.repository.interface.js'
import { Ok, Err } from '@shared/result.js'
import { errorFactory } from '@shared/errors.js'

/**
 * Unit tests for ShortenUrl use case.
 */
jest.mock('nanoid', () => ({
  customAlphabet: jest.fn(() => {
    return jest.fn(() => mockCodes.shift() || 'fallback')
  }),
}))

let mockCodes: string[] = []

describe('shortenUrl()', () => {
  let repo: jest.Mocked<IShortUrlRepository>
  let useCase: ShortenUrl
  const baseUrl = 'http://short'
  const userId = 'user-123'

  beforeEach(() => {
    mockCodes = []
    repo = {
      save: jest.fn(),
      findByCode: jest.fn(),
    } as unknown as jest.Mocked<IShortUrlRepository>
    useCase = new ShortenUrl(repo, baseUrl)
  })

  it('returns shortened url when first code succeeds', async () => {
    mockCodes.push('abc123')
    repo.save.mockResolvedValue(Ok(undefined))

    const result = await useCase.shortenUrl('https://example.com')
    expect(result.ok).toBe(true)
    const okResult = result as typeof result & { ok: true }
    expect(okResult.value).toBe(`${baseUrl}/abc123`)
    expect(repo.save).toHaveBeenCalledTimes(1)
  })

  it('returns user-owned shortened url when userId provided', async () => {
    mockCodes.push('userCode1')
    repo.save.mockResolvedValue(Ok(undefined))

    const result = await useCase.shortenUrl('https://example.com/user', userId)
    expect(result.ok).toBe(true)
    const okResult = result as typeof result & { ok: true }
    expect(okResult.value).toBe(`${baseUrl}/userCode1`)
    expect(repo.save).toHaveBeenCalledTimes(1)
    const entityArg = repo.save.mock.calls[0][0]
    expect(entityArg.userId).toBe(userId)
  })

  it('retries on collision until success', async () => {
    mockCodes.push('taken1', 'taken2', 'freeOk')
    repo.save
      .mockResolvedValueOnce(Err(errorFactory.domain('DuplicateCode', 'duplicate')))
      .mockResolvedValueOnce(Err(errorFactory.domain('DuplicateCode', 'duplicate')))
      .mockResolvedValueOnce(Ok(undefined))

    const result = await useCase.shortenUrl('https://retry.com')
    expect(result.ok).toBe(true)
    const okResult = result as typeof result & { ok: true }
    expect(okResult.value).toBe(`${baseUrl}/freeOk`)
    expect(repo.save).toHaveBeenCalledTimes(3)
  })

  it('retries on collision for user-owned until success', async () => {
    mockCodes.push('uDup1', 'uDup2', 'uFree')
    repo.save.mockReset()
    repo.save
      .mockResolvedValueOnce(Err(errorFactory.domain('DuplicateCode', 'duplicate')))
      .mockResolvedValueOnce(Err(errorFactory.domain('DuplicateCode', 'duplicate')))
      .mockResolvedValueOnce(Ok(undefined))

    const result = await useCase.shortenUrl('https://retry-owned.com', userId)
    expect(result.ok).toBe(true)
    const okResult = result as typeof result & { ok: true }
    expect(okResult.value).toBe(`${baseUrl}/uFree`)
    expect(repo.save).toHaveBeenCalledTimes(3)
    repo.save.mock.calls.forEach((c) => expect(c[0].userId).toBe(userId))
  })

  it('returns Err(MaxCodeGenerationAttemptsError) after max attempts', async () => {
    mockCodes.push('dup', 'dup', 'dup', 'dup', 'dup')
    repo.save.mockResolvedValue(Err(errorFactory.domain('DuplicateCode', 'duplicate')))

    const result = await useCase.shortenUrl('https://fail.com')
    expect(result.ok).toBe(false)
    const errResult = result as typeof result & { ok: false }
    expect(errResult.error.type).toBe('MaxCodeGenerationAttemptsError')
    expect(repo.save).toHaveBeenCalledTimes(5)
  })

  it('returns Err(MaxCodeGenerationAttemptsError) after max attempts for user-owned', async () => {
    mockCodes.push('x1', 'x2', 'x3', 'x4', 'x5')
    repo.save.mockResolvedValue(Err(errorFactory.domain('DuplicateCode', 'duplicate')))

    const result = await useCase.shortenUrl('https://owned-fail.com', userId)
    expect(result.ok).toBe(false)
    const errResult = result as typeof result & { ok: false }
    expect(errResult.error.type).toBe('MaxCodeGenerationAttemptsError')
  })
})
