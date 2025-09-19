import { RefreshToken } from '@domain/entities/auth/refresh-token.js'

describe('RefreshToken', () => {
  const base = {
    sessionId: 'sess-123',
    userId: 'user-456',
    hash: Buffer.from('hashed-token'),
    hashAlgo: 'sha256',
    now: new Date('2025-08-31T10:00:00.000Z'),
    ttlSec: 7200,
    ip: '198.51.100.10',
    userAgent: 'jest-agent',
    previousTokenId: 'sess-old',
  }

  describe('fresh()', () => {
    it('creates an active token with computed expiresAt and lastUsedAt = issuedAt', () => {
      const t = RefreshToken.fresh(base)
      expect(t.id).toBe('')
      expect(t.sessionId).toBe(base.sessionId)
      expect(t.userId).toBe(base.userId)
      expect(t.digest.value.equals(base.hash)).toBe(true)
      expect(t.digest.algo).toBe(base.hashAlgo)
      expect(t.status).toBe('active')
      expect(t.issuedAt.toISOString()).toBe(base.now.toISOString())
      expect(t.lastUsedAt.toISOString()).toBe(base.now.toISOString())
      expect(t.expiresAt.toISOString()).toBe('2025-08-31T12:00:00.000Z')
      expect(t.ip).toBe(base.ip)
      expect(t.userAgent).toBe(base.userAgent)
      expect(t.digest).toEqual({ value: base.hash, algo: base.hashAlgo })
      expect(t.previousTokenId).toBe(base.previousTokenId)
    })
  })

  describe('hydrate()', () => {
    it('rehydrates a full token state', () => {
      const token = RefreshToken.hydrate({
        id: 'rt-1',
        sessionId: base.sessionId,
        userId: base.userId,
        hash: base.hash,
        hashAlgo: base.hashAlgo,
        status: 'rotated',
        issuedAt: new Date('2025-08-31T09:00:00.000Z'),
        expiresAt: new Date('2025-08-31T12:00:00.000Z'),
        ip: base.ip,
        userAgent: base.userAgent,
        lastUsedAt: new Date('2025-08-31T11:00:00.000Z'),
        previousTokenId: 'prev-token-1',
      })
      expect(token.id).toBe('rt-1')
      expect(token.sessionId).toBe(base.sessionId)
      expect(token.userId).toBe(base.userId)
      expect(token.digest.value.equals(base.hash)).toBe(true)
      expect(token.digest.algo).toBe(base.hashAlgo)
      expect(token.status).toBe('rotated')
      expect(token.issuedAt.toISOString()).toBe('2025-08-31T09:00:00.000Z')
      expect(token.expiresAt.toISOString()).toBe('2025-08-31T12:00:00.000Z')
      expect(token.ip).toBe(base.ip)
      expect(token.userAgent).toBe(base.userAgent)
      expect(token.lastUsedAt.toISOString()).toBe('2025-08-31T11:00:00.000Z')
      expect(token.previousTokenId).toBe('prev-token-1')
      expect(token.digest).toEqual({ value: base.hash, algo: base.hashAlgo })
    })
  })

  describe('markRotated()', () => {
    it('sets status to rotated and updates lastUsedAt', () => {
      const t = RefreshToken.fresh(base)
      const when = new Date('2025-08-31T10:30:00.000Z')
      t.markRotated(when)
      expect(t.status).toBe('rotated')
      expect(t.lastUsedAt.toISOString()).toBe(when.toISOString())
    })
  })

  describe('markRevoked()', () => {
    it('sets status to revoked (does not change lastUsedAt)', () => {
      const t = RefreshToken.fresh(base)
      const originalLastUsed = t.lastUsedAt.toISOString()
      t.markRevoked()
      expect(t.status).toBe('revoked')
      expect(t.lastUsedAt.toISOString()).toBe(originalLastUsed)
    })
  })

  describe('markReused()', () => {
    it('sets status to reuse_detected', () => {
      const t = RefreshToken.fresh(base)
      t.markReused()
      expect(t.status).toBe('reuse_detected')
    })
  })

  describe('markExpired()', () => {
    it('sets status to expired', () => {
      const t = RefreshToken.fresh(base)
      t.markExpired()
      expect(t.status).toBe('expired')
    })
  })

  describe('isActive()', () => {
    it('returns true for a freshly created token', () => {
      const t = RefreshToken.fresh(base)
      expect(t.isActive()).toBe(true)
    })

    it('returns false after rotation', () => {
      const t = RefreshToken.fresh(base)
      t.markRotated(new Date('2025-08-31T10:30:00.000Z'))
      expect(t.isActive()).toBe(false)
    })

    it('returns false after revocation', () => {
      const t = RefreshToken.fresh(base)
      t.markRevoked()
      expect(t.isActive()).toBe(false)
    })

    it('returns false after reuse detection', () => {
      const t = RefreshToken.fresh(base)
      t.markReused()
      expect(t.isActive()).toBe(false)
    })

    it('returns false after expiry', () => {
      const t = RefreshToken.fresh(base)
      t.markExpired()
      expect(t.isActive()).toBe(false)
    })
  })
})
