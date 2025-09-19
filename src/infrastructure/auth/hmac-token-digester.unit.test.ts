import { UnsupportedHmacAlgorithmError } from '@infrastructure/errors/unsupported-hmac-algorithm.error.js'
import { HmacTokenDigester } from '@infrastructure/auth/hmac-token-digester.js'

describe('HmacTokenDigester', () => {
  const secret = 'super-secret'
  const algo = 'sha256'
  const mockedDigest = Buffer.from('digest-bytes', 'utf-8')
  const hmac = {
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue(mockedDigest),
  }
  const hmacFactory = jest.fn().mockReturnValue(hmac)
  const digester = new HmacTokenDigester(secret, hmacFactory, algo)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('digest()', () => {
    it('produces a deterministic digest buffer for the same input', () => {
      const input = Buffer.from('hello-world')
      const digest = digester.digest(input)
      expect(hmacFactory).toHaveBeenCalledWith(algo, secret)
      expect(hmac.update).toHaveBeenCalledWith(input)
      expect(hmac.digest).toHaveBeenCalledTimes(1)
      expect(digest).toEqual({ value: mockedDigest, algo })
    })
  })

  describe('verify()', () => {
    it('returns true when hash matches input', () => {
      const input = Buffer.from('validate-me')
      const digest = digester.digest(input)
      expect(digester.verify(input, digest)).toBe(true)
      expect(hmacFactory).toHaveBeenCalledWith(algo, secret)
      expect(hmac.update).toHaveBeenCalledWith(input)
      expect(hmac.digest).toHaveBeenCalledTimes(2)
    })

    it('returns false when hash does not match input', () => {
      const first = Buffer.from('first')
      const tokenDigest = digester.digest(first)
      // Force subsequent compute to differ by swapping digest return buffer
      const wrongDigest = Buffer.from('a'.repeat(mockedDigest.length))
      hmac.digest.mockReturnValueOnce(wrongDigest)
      const other = Buffer.from('second')
      expect(digester.verify(other, tokenDigest)).toBe(false)
    })

    it('returns false when provided hash length differs', () => {
      const input = Buffer.from('length-check')
      const shorter = { value: mockedDigest.subarray(0, mockedDigest.length - 2), algo: algo }
      expect(digester.verify(input, shorter)).toBe(false)
    })

    it('throws for unsupported algorithm at construction', () => {
      expect(() => new HmacTokenDigester(secret, hmacFactory, 'md5')).toThrow(
        UnsupportedHmacAlgorithmError,
      )
    })
  })
})
