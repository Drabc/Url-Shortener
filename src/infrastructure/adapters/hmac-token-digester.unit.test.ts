import { HmacTokenDigester } from './hmac-token-digester.js'

describe('HmacTokenDigester', () => {
  const secret = 'super-secret'
  const algo = 'sha256'
  const mockedDigest = Buffer.from('hex_digest', 'utf-8')
  const mockedHex = mockedDigest.toString('hex')
  const hmac = {
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue(mockedDigest),
  }
  const hmacFactory = jest.fn().mockReturnValue(hmac)
  const digester = new HmacTokenDigester(hmacFactory, secret, algo)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('digest()', () => {
    it('produces a deterministic hex digest for the same input', () => {
      const input = 'hello-world'
      const digest = digester.digest(input)
      expect(hmacFactory).toHaveBeenCalledWith(algo, secret)
      expect(hmac.update).toHaveBeenCalledWith(input)
      expect(hmac.digest).toHaveBeenCalledTimes(1)
      expect(digest).toEqual({ value: mockedHex, algo })
    })
  })

  describe('verify()', () => {
    it('returns true when hash matches input', () => {
      const input = 'validate-me'
      const digest = digester.digest(input)
      expect(digester.verify(input, digest)).toBe(true)
      expect(hmacFactory).toHaveBeenCalledWith(algo, secret)
      expect(hmac.update).toHaveBeenCalledWith(input)
      expect(hmac.digest).toHaveBeenCalledTimes(2)
    })

    it('returns false when hash does not match input', () => {
      const wrongDigest = Buffer.from('a'.repeat(mockedDigest.length))
      hmac.digest.mockReturnValue(wrongDigest)
      const good = { value: mockedHex, algo }
      expect(digester.verify('other', good)).toBe(false)
    })

    it('returns false when provided hash length differs', () => {
      const input = 'length-check'
      const full = digester.digest(input)
      // mutate value length by trimming chars so timingSafeEqual length check fails
      const shorter = { value: full.value.slice(0, -2), algo: full.algo }
      expect(digester.verify(input, shorter)).toBe(false)
    })

    it('throws for unsupported algorithm at construction', () => {
      expect(() => new HmacTokenDigester(hmacFactory, secret, 'md5')).toThrow(
        /Unsupported HMAC algorithm/i,
      )
    })
  })
})
