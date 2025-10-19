import { ResolveUrl } from '@application/use-cases/resolve-url.use-case.js'
import { Ok, Err } from '@shared/result.js'
import { IShortUrlRepository } from '@domain/repositories/short-url.repository.interface.js'
import { ShortUrl } from '@domain/entities/short-url.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
import { errorFactory } from '@shared/errors.js'

type Success<T> = T & { ok: true }
type Failure<T> = Exclude<T, { ok: true }>

describe('resolveUrl()', () => {
  let repo: jest.Mocked<IShortUrlRepository>
  let useCase: ResolveUrl

  beforeEach(() => {
    repo = {
      findByCode: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<IShortUrlRepository>
    useCase = new ResolveUrl(repo)
  })

  it('returns Ok(original url) when entity found', async () => {
    const urlRes = ValidUrl.create('https://example.com')
    expect(urlRes.ok).toBe(true)
    const entityRes = ShortUrl.create('id-1', 'abc123', (urlRes as Success<typeof urlRes>).value)
    expect(entityRes.ok).toBe(true)
    repo.findByCode.mockResolvedValue(entityRes)

    const res = await useCase.resolveUrl('abc123')
    expect(repo.findByCode).toHaveBeenCalledWith('abc123')
    expect(res.ok).toBe(true)
    const success = res as Success<typeof res>
    expect(success.value).toBe('https://example.com')
  })

  it('returns Err(ResourceNotFound) when code missing', async () => {
    repo.findByCode.mockResolvedValue(Ok(null))
    const res = await useCase.resolveUrl('missing')
    expect(repo.findByCode).toHaveBeenCalledWith('missing')
    expect(res.ok).toBe(false)
    const failure = res as Failure<typeof res>
    expect(failure.error.type).toBe('ResourceNotFound')
  })

  it('propagates underlying repository Err', async () => {
    const repoErr = Err(errorFactory.domain('InvalidValue', 'validation'))
    repo.findByCode.mockResolvedValue(repoErr as unknown as ReturnType<typeof repo.findByCode>)
    const res = await useCase.resolveUrl('bad')
    expect(res.ok).toBe(false)
    const failure = res as Failure<typeof res>
    expect(failure.error.type).toBe('InvalidValue')
  })
})
