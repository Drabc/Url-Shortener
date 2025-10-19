import { ValidUrl } from '@domain/value-objects/valid-url.js'
import { ShortUrl } from '@domain/entities/short-url.js'

type Success<T> = T & { ok: true }
type Failure<T> = Exclude<T, { ok: true }>

describe('ShortUrl Entity', () => {
  let validUrl: jest.Mocked<ValidUrl>
  let code: string

  beforeEach(() => {
    validUrl = { value: 'https://example.com' } as ValidUrl
    code = 'abc123'
  })

  it('create returns Ok with valid code (anonymous)', () => {
    const res = ShortUrl.create('id-1', code, validUrl)
    expect(res.ok).toBe(true)
    const success = res as Success<typeof res>
    expect(success.value.code).toBe(code)
    expect(success.value.url).toBe(validUrl.value)
    expect(success.value.userId).toBeUndefined()
  })

  it('create returns Err when code empty (anonymous)', () => {
    const res = ShortUrl.create('id-1', '', validUrl)
    expect(res.ok).toBe(false)
    const failure = res as Failure<typeof res>
    expect(failure.error.type).toBe('InvalidValue')
  })

  it('create returns Ok with valid code and userId (owned)', () => {
    const res = ShortUrl.create('id-2', code, validUrl, 'user-1')
    expect(res.ok).toBe(true)
    const success = res as Success<typeof res>
    expect(success.value.code).toBe(code)
    expect(success.value.url).toBe(validUrl.value)
    expect(success.value.userId).toBe('user-1')
  })

  it('create returns Err when code empty (owned)', () => {
    const res = ShortUrl.create('id-2', '', validUrl, 'user-1')
    expect(res.ok).toBe(false)
    const failure = res as Failure<typeof res>
    expect(failure.error.type).toBe('InvalidValue')
  })
})
