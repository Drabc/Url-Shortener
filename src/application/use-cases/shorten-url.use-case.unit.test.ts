import { ShortenUrl } from '@application/use-cases/shorten-url.use-case.js'
import { MaxCodeGenerationAttemptsError } from '@application/errors/max-code-generation-attempts.error.js'
import { IShortUrlRepository } from '@domain/repositories/short-url.repository.interface.js'
import { CodeExistsError } from '@infrastructure/errors/repository.error.js'

/**
 * Unit tests for ShortenUrl use case.
 */
jest.mock('nanoid', () => ({
  customAlphabet: jest.fn(() => {
    return jest.fn(() => mockCodes.shift() || 'fallback')
  }),
}))

let mockCodes: string[] = []

describe('ShortenUrl.shortenUrl()', () => {
  let repo: jest.Mocked<IShortUrlRepository>
  let useCase: ShortenUrl
  const baseUrl = 'http://short'

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
    repo.save.mockResolvedValue(undefined)

    const result = await useCase.shortenUrl('https://example.com')

    expect(result).toBe(`${baseUrl}/abc123`)
    expect(repo.save).toHaveBeenCalledTimes(1)
  })

  it('retries on collision until success', async () => {
    mockCodes.push('taken1', 'taken2', 'freeOk')

    repo.save
      .mockRejectedValueOnce(new CodeExistsError('taken1'))
      .mockRejectedValueOnce(new CodeExistsError('taken2'))
      .mockResolvedValueOnce(undefined)

    const result = await useCase.shortenUrl('https://retry.com')

    expect(result).toBe(`${baseUrl}/freeOk`)
    expect(repo.save).toHaveBeenCalledTimes(3)
  })

  it('throws MaxCodeGenerationAttemptsError after max attempts', async () => {
    mockCodes.push('dup', 'dup', 'dup', 'dup', 'dup')
    repo.save.mockRejectedValue(new CodeExistsError('dup'))

    await expect(useCase.shortenUrl('https://fail.com')).rejects.toBeInstanceOf(
      MaxCodeGenerationAttemptsError,
    )
    expect(repo.save).toHaveBeenCalledTimes(5)
  })
})
