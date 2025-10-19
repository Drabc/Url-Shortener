import type { CryptoKey, JWTPayload } from 'jose'
import { Logger } from 'pino'

import { JwtService } from '@infrastructure/auth/jwt.service.js'

type Header = { alg: string }

jest.mock('jose', () => {
  /**
   * Fake implementation of SignJWT used in tests to mimic JWT signing without real cryptographic operations.
   */
  class FakeSignJWT {
    private header: Header = { alg: 'HS256' }
    private claims: Record<string, unknown> = {}
    /**
     * Sets the protected header for the fake JWT.
     * @param {Header} h Header values.
     * @returns {FakeSignJWT} This builder instance for chaining.
     */
    setProtectedHeader(h: Header) {
      this.header = h
      return this
    }
    /**
     * Sets the issued-at (iat) claim.
     * @param {number} iat Epoch seconds or date surrogate.
     * @returns {FakeSignJWT} This builder instance.
     */
    setIssuedAt(iat: number) {
      this.claims.iat = iat
      return this
    }
    /**
     * Sets the expiration (exp) claim.
     * @param {number} exp Epoch seconds when token expires.
     * @returns {FakeSignJWT} This builder instance.
     */
    setExpirationTime(exp: number) {
      this.claims.exp = exp
      return this
    }
    /**
     * Sets the issuer (iss) claim.
     * @param {string} iss Issuer identifier.
     * @returns {FakeSignJWT} This builder instance.
     */
    setIssuer(iss: string) {
      this.claims.iss = iss
      return this
    }
    /**
     * Sets the audience (aud) claim.
     * @param {string} aud Audience identifier.
     * @returns {FakeSignJWT} This builder instance.
     */
    setAudience(aud: string) {
      this.claims.aud = aud
      return this
    }
    /**
     * Sets the subject (sub) claim.
     * @param {string} sub Subject / user id.
     * @returns {FakeSignJWT} This builder instance.
     */
    setSubject(sub: string) {
      this.claims.sub = sub
      return this
    }
    /**
     * Sets the JWT ID (jti) claim.
     * @param {string} jti Unique token id.
     * @returns {FakeSignJWT} This builder instance.
     */
    setJti(jti: string) {
      this.claims.jti = jti
      return this
    }
    /**
     * Produces a serialized fake JWT representation.
     * @returns {string} JSON string containing header & payload.
     */
    async sign() {
      return JSON.stringify({ header: this.header, payload: this.claims })
    }
  }
  return { SignJWT: FakeSignJWT }
})

describe('JwtService', () => {
  const issuer = 'issuer'
  const audience = 'aud'
  const algo = 'HS256'
  const ttl = 3600
  const id = '12345678-1234-1234-1234-123456789012'

  const fakePrivateKey = {} as unknown as CryptoKey
  const fakePublicKey = {} as unknown as CryptoKey

  const fixedNow = new Date('2025-01-01T00:00:00.000Z')

  const clock = { now: () => fixedNow }
  const logger = { warn: jest.fn() } as unknown as jest.Mocked<Logger>
  const idGen = jest.fn(() => id) as unknown as typeof crypto.randomUUID
  const verifier = jest.fn()
  const jwtService = new JwtService(
    issuer,
    audience,
    algo,
    ttl,
    fakePrivateKey,
    fakePublicKey,
    clock,
    logger,
    verifier,
    idGen,
  )

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('issue', () => {
    it('produces a signed token embedding required claims', async () => {
      const token = await jwtService.issue('user-1')
      const { payload, header } = JSON.parse(token)
      const expectedExpired = new Date(clock.now().getTime() + ttl * 1000).toISOString()

      expect(header).toEqual({ alg: algo })
      expect(payload).toMatchObject({
        iat: fixedNow.toISOString(),
        exp: expectedExpired,
        iss: issuer,
        aud: audience,
        sub: 'user-1',
        jti: id,
      })
    })
  })

  describe('verify', () => {
    type Success<T> = Extract<T, { ok: true }>
    type Failure<T> = Extract<T, { ok: false }>
    it('returns Ok with mapped claims when verification succeeds', async () => {
      const payload: JWTPayload = {
        sub: 'user-1',
        iss: issuer,
        aud: audience,
        exp: clock.now().getTime() + ttl,
        iat: clock.now().getTime(),
        jti: '12345678-1234-1234-1234-123456789012',
      }
      verifier.mockResolvedValue({ payload })
      const res = await jwtService.verify('token')
      const okRes: Success<typeof res> = res as Success<typeof res>
      expect(okRes.ok).toBe(true)
      expect(okRes.value).toEqual({
        subject: 'user-1',
        issuer,
        audience: [audience],
        expiresAt: new Date(payload.exp!),
        issuedAt: new Date(payload.iat!),
        jti: '12345678-1234-1234-1234-123456789012',
      })
    })

    it('returns Err InvalidAccessToken and logs on verifier error', async () => {
      verifier.mockRejectedValue(new Error('boom'))
      const res = await jwtService.verify('bad')
      const errRes: Failure<typeof res> = res as Failure<typeof res>
      expect(errRes.ok).toBe(false)
      expect(errRes.error.type).toBe('InvalidAccessToken')
      expect(logger.warn).toHaveBeenCalled()
    })

    it('returns Err when required claim missing (sub)', async () => {
      const payload: JWTPayload = {
        iss: issuer,
        aud: audience,
        exp: clock.now().getTime() + ttl,
        iat: clock.now().getTime(),
        jti: '12345678-1234-1234-1234-123456789012',
      }
      verifier.mockResolvedValue({ payload })
      const res = await jwtService.verify('token')
      const errRes: Failure<typeof res> = res as Failure<typeof res>
      expect(errRes.ok).toBe(false)
      expect(errRes.error.type).toBe('InvalidAccessToken')
      expect(logger.warn).not.toHaveBeenCalled()
    })
  })
})
