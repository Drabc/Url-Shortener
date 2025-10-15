import { ResolveUrl } from '@application/use-cases/resolve-url.use-case.js'
import { Ok } from '@shared/result.js'
import { IShortUrlRepository } from '@domain/repositories/short-url.repository.interface.js'
import { ShortUrl } from '@domain/entities/short-url.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'

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

  it('returns original url when entity found', async () => {
    const entity = new ShortUrl('', 'abc123', new ValidUrl('https://example.com'))
    repo.findByCode.mockResolvedValue(entity as unknown as ReturnType<typeof repo.findByCode>)

    const result = await useCase.resolveUrl('abc123')
    expect(repo.findByCode).toHaveBeenCalledWith('abc123')
    expect(result).toEqual(Ok('https://example.com'))
  })

  it('returns Err(ResourceNotFound) when code missing', async () => {
    repo.findByCode.mockResolvedValue(null)
    const res = await useCase.resolveUrl('missing')
    expect(res.ok).toBe(false)
    const errRes = res as typeof res & { ok: false }
    expect(errRes.error.kind).toBe('application')
    expect(errRes.error.type).toBe('ResourceNotFound')
  })
})
