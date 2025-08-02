import { InvalidUrlError } from '@domain/errors/invalid-url.error.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'

describe('ValidUrl', () => {
  it('should not throw an error when a valid url is provided', () => {
    expect(() => new ValidUrl('https://example.com')).not.toThrow()
  })

  it('should not throw an error for a valid URL with path and query', () => {
    expect(() => new ValidUrl('https://example.com/path?query=1')).not.toThrow()
  })

  it('should not throw an error for a valid URL with port', () => {
    expect(() => new ValidUrl('https://example.com:3000')).not.toThrow()
  })

  it('should throw an error when the url is empty', () => {
    expect(() => new ValidUrl('')).toThrow(InvalidUrlError)
  })

  it('should throw an error when for non url string', () => {
    expect(() => new ValidUrl('not a url')).toThrow(InvalidUrlError)
  })

  it('should throw an error for a url without protocol', () => {
    expect(() => new ValidUrl('www.example.com')).toThrow(InvalidUrlError)
  })
})
