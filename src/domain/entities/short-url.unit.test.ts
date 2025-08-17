import { ValidUrl } from '@domain/value-objects/valid-url.js'
import { ShortUrl } from '@domain/entities/short-url.js'

describe('ShortUrl', () => {
  let validUrl: jest.Mocked<ValidUrl>
  let code: string

  beforeEach(() => {
    validUrl = { value: 'https://example.com' }
    code = 'abc123'
  })

  it('should create ShortUrl with valid code and url', () => {
    const shortUrl = new ShortUrl('', code, validUrl)
    expect(shortUrl.code).toBe(code)
    expect(shortUrl.url).toBe(validUrl.value)
  })

  it('should throw if code is empty', () => {
    expect(() => new ShortUrl('', '', validUrl)).toThrow()
  })
})
