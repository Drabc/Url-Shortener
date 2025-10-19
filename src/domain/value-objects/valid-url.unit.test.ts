import { ValidUrl } from '@domain/value-objects/valid-url.js'

type Success<T> = T & { ok: true }
type Failure<T> = Exclude<T, { ok: true }>

describe('ValidUrl.create()', () => {
  it('returns Ok for a simple valid https url', () => {
    const res = ValidUrl.create('https://example.com')
    expect(res.ok).toBe(true)
    const success = res as Success<typeof res>
    expect(success.value.value).toBe('https://example.com')
  })

  it('returns Ok for valid URL with path and query', () => {
    const raw = 'https://example.com/path?query=1'
    const res = ValidUrl.create(raw)
    expect(res.ok).toBe(true)
    expect((res as Success<typeof res>).value.value).toBe(raw)
  })

  it('returns Ok for valid URL with port', () => {
    const raw = 'https://example.com:3000'
    const res = ValidUrl.create(raw)
    expect(res.ok).toBe(true)
    expect((res as Success<typeof res>).value.value).toBe(raw)
  })

  it('returns Err when url is empty', () => {
    const res = ValidUrl.create('')
    expect(res.ok).toBe(false)
    const failure = res as Failure<typeof res>
    expect(failure.error.type).toBe('InvalidUrl')
  })

  it('returns Err for a malformed url string', () => {
    const res = ValidUrl.create('not a url')
    expect(res.ok).toBe(false)
    const failure = res as Failure<typeof res>
    expect(failure.error.type).toBe('InvalidUrl')
  })

  it('returns Err for url without protocol', () => {
    const res = ValidUrl.create('www.example.com')
    expect(res.ok).toBe(false)
    const failure = res as Failure<typeof res>
    expect(failure.error.type).toBe('InvalidUrl')
  })
})
