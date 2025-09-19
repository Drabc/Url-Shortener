import { Session } from '@domain/entities/auth/session.js'
import { RefreshToken } from '@domain/entities/auth/refresh-token.js'
import {
  SessionNotActiveError,
  NoActiveRefreshTokenError,
  SessionExpiredError,
  RefreshTokenReuseDetectedError,
} from '@domain/errors/session.errors.js'
import { Digest, ITokenDigester } from '@domain/utils/token-digester.js'
import { PlainRefreshSecret } from '@domain/value-objects/plain-refresh-secret.js'

describe('Session', () => {
  const base = {
    userId: 'user-123',
    clientId: 'cli-abc',
    now: new Date('2025-08-31T12:00:00.000Z'),
    ttlSec: 3600,
    ip: '203.0.113.5',
    userAgent: 'jest-test',
    plainSecret: PlainRefreshSecret.fromBytes(Buffer.from('abcdefghijklmnop')), // 16 bytes
    expectedDigest: Buffer.from('abc123digest'),
  }

  const digest = { value: base.expectedDigest, algo: 'sha256' }

  describe('start()', () => {
    it('creates an active session with computed expiresAt', () => {
      const s = Session.start({
        userId: base.userId,
        clientId: base.clientId,
        now: base.now,
        ttlSec: base.ttlSec,
        digest,
        ip: base.ip,
        userAgent: base.userAgent,
      })
      expect(s.id).toBe('')
      expect(s.userId).toBe(base.userId)
      expect(s.clientId).toBe(base.clientId)
      expect(s.status).toBe('active')
      expect(s.expiresAt.toISOString()).toBe('2025-08-31T13:00:00.000Z')
      expect(s.lastUsedAt?.toISOString()).toBe(base.now.toISOString())
      expect(s.ip).toBe(base.ip)
      expect(s.userAgent).toBe(base.userAgent)
      expect(s.endedAt).toBeUndefined()
      expect(s.endReason).toBeUndefined()
      // initial refresh token
      expect(s.tokens.length).toBe(1)
      const first = s.tokens[0]
      expect(first.status).toBe('active')
      expect(first.digest.value.equals(base.expectedDigest)).toBe(true)
      expect(first.digest.algo).toBe('sha256')
    })
  })

  describe('hydrate()', () => {
    it('rehydrates a full session', () => {
      const hydrated = Session.hydrate({
        id: 'sess-1',
        userId: base.userId,
        clientId: base.clientId,
        status: 'revoked',
        lastUsedAt: new Date('2025-08-31T12:05:00.000Z'),
        expiresAt: new Date('2025-08-31T13:00:00.000Z'),
        tokens: [],
        ip: base.ip,
        userAgent: base.userAgent,
        endedAt: new Date('2025-08-31T12:10:00.000Z'),
        endReason: 'manual',
      })
      expect(hydrated.id).toBe('sess-1')
      expect(hydrated.userId).toBe(base.userId)
      expect(hydrated.clientId).toBe(base.clientId)
      expect(hydrated.status).toBe('revoked')
      expect(hydrated.lastUsedAt?.toISOString()).toBe('2025-08-31T12:05:00.000Z')
      expect(hydrated.expiresAt?.toISOString()).toBe('2025-08-31T13:00:00.000Z')
      expect(hydrated.ip).toBe(base.ip)
      expect(hydrated.userAgent).toBe(base.userAgent)
      expect(hydrated.endedAt?.toISOString()).toBe('2025-08-31T12:10:00.000Z')
      expect(hydrated.endReason).toBe('manual')
    })
  })

  describe('touch()', () => {
    it('updates lastUsedAt', () => {
      const s = Session.start({
        userId: base.userId,
        clientId: base.clientId,
        now: base.now,
        ttlSec: base.ttlSec,
        digest,
        ip: base.ip,
        userAgent: base.userAgent,
      })
      const later = new Date('2025-08-31T12:30:00.000Z')
      s.touch(later)
      expect(s.lastUsedAt?.toISOString()).toBe(later.toISOString())
    })
  })

  describe('revoke()', () => {
    it('sets revoked fields and status; second revoke is no-op', () => {
      const s = Session.start({
        userId: base.userId,
        clientId: base.clientId,
        now: base.now,
        ttlSec: base.ttlSec,
        digest,
        ip: base.ip,
        userAgent: base.userAgent,
      })
      const when = new Date('2025-08-31T12:10:00.000Z')
      s.revoke(when, 'logout')
      expect(s.status).toBe('revoked')
      expect(s.endedAt?.toISOString()).toBe(when.toISOString())
      expect(s.endReason).toBe('logout')
      const later = new Date('2025-08-31T12:20:00.000Z')
      s.revoke(later, 'ignored')
      expect(s.endedAt?.toISOString()).toBe(when.toISOString())
      expect(s.endReason).toBe('logout')
    })
  })
  describe('rotateToken()', () => {
    const makeToken = (overrides: Partial<Parameters<typeof RefreshToken.hydrate>[0]> = {}) => {
      return RefreshToken.hydrate({
        id: overrides.id || 'rt-1',
        sessionId: overrides.sessionId || 'sess-1',
        userId: base.userId,
        hash: base.expectedDigest,
        hashAlgo: 'sha256',
        status: overrides.status || 'active',
        issuedAt: base.now,
        expiresAt: new Date(base.now.getTime() + base.ttlSec * 1000),
        ip: base.ip,
        userAgent: base.userAgent,
        lastUsedAt: base.now,
        previousTokenId: overrides.previousTokenId,
      })
    }

    const verifier = (matches: boolean): ITokenDigester => ({
      digest(): Digest {
        return { value: Buffer.from('ignored'), algo: 'sha256' }
      },
      verify(): boolean {
        return matches
      },
    })

    it('rotates an active token successfully', () => {
      const active = makeToken()
      const s = Session.hydrate({
        id: 'sess-1',
        userId: base.userId,
        clientId: base.clientId,
        status: 'active',
        lastUsedAt: base.now,
        expiresAt: new Date(base.now.getTime() + base.ttlSec * 1000),
        tokens: [active],
        ip: base.ip,
        userAgent: base.userAgent,
      })
      const newDigest: Digest = { value: Buffer.from('new-hash'), algo: 'sha256' }
      s.rotateToken(
        Buffer.from('presented'),
        newDigest,
        verifier(true),
        new Date('2025-08-31T12:10:00.000Z'),
      )
      expect(active.status).toBe('rotated')
      expect(s.tokens.at(-1)?.previousTokenId).toBe(active.id)
      expect(s.status).toBe('active')
    })

    it('throws SessionNotActiveError when session not active', () => {
      const active = makeToken()
      const s = Session.hydrate({
        id: 'sess-1',
        userId: base.userId,
        clientId: base.clientId,
        status: 'revoked',
        lastUsedAt: base.now,
        expiresAt: new Date(base.now.getTime() + base.ttlSec * 1000),
        tokens: [active],
        ip: base.ip,
        userAgent: base.userAgent,
      })
      const newDigest: Digest = { value: Buffer.from('new-hash'), algo: 'sha256' }
      expect(() =>
        s.rotateToken(Buffer.from('presented'), newDigest, verifier(true), base.now),
      ).toThrow(SessionNotActiveError)
    })

    it('throws NoActiveRefreshTokenError when no active token exists', () => {
      const revoked = makeToken({ status: 'revoked', id: 'rt-x' })
      const s = Session.hydrate({
        id: 'sess-1',
        userId: base.userId,
        clientId: base.clientId,
        status: 'active',
        lastUsedAt: base.now,
        expiresAt: new Date(base.now.getTime() + base.ttlSec * 1000),
        tokens: [revoked],
        ip: base.ip,
        userAgent: base.userAgent,
      })
      const newDigest: Digest = { value: Buffer.from('new-hash'), algo: 'sha256' }
      expect(() =>
        s.rotateToken(Buffer.from('presented'), newDigest, verifier(true), base.now),
      ).toThrow(NoActiveRefreshTokenError)
      expect(s.status).toBe('revoked')
      expect(s.endedAt).toBe(base.now)
      expect(s.endReason).toBeDefined()
    })

    it('throws SessionExpiredError when session expired', () => {
      const active = makeToken()
      const expiresAt = new Date(base.now.getTime() + 1000)
      const s = Session.hydrate({
        id: 'sess-1',
        userId: base.userId,
        clientId: base.clientId,
        status: 'active',
        lastUsedAt: base.now,
        expiresAt,
        tokens: [active],
        ip: base.ip,
        userAgent: base.userAgent,
      })
      const afterExpiry = new Date(expiresAt.getTime() + 1)
      const newDigest: Digest = { value: Buffer.from('new-hash'), algo: 'sha256' }
      expect(() =>
        s.rotateToken(Buffer.from('presented'), newDigest, verifier(true), afterExpiry),
      ).toThrow(SessionExpiredError)
      expect(active.status).toBe('revoked')
      expect(s.status).toBe('expired')
      expect(s.endedAt).toBe(afterExpiry)
      expect(s.endReason).toBeDefined()
    })

    it(`throws RefreshTokenReuseDetectedError when the presented token hash does not
        match the active hash`, () => {
      const active = makeToken()
      const s = Session.hydrate({
        id: 'sess-1',
        userId: base.userId,
        clientId: base.clientId,
        status: 'active',
        lastUsedAt: base.now,
        expiresAt: new Date(base.now.getTime() + base.ttlSec * 1000),
        tokens: [active],
        ip: base.ip,
        userAgent: base.userAgent,
      })
      const newDigest: Digest = { value: Buffer.from('new-hash'), algo: 'sha256' }
      expect(() =>
        s.rotateToken(Buffer.from('wrong'), newDigest, verifier(false), base.now),
      ).toThrow(RefreshTokenReuseDetectedError)
      expect(active.status).toBe('reuse_detected')
      expect(s.status).toBe('reuse_detected')
      expect(s.endedAt).toBe(base.now)
      expect(s.endReason).toBeDefined()
    })
  })

  describe('hasActiveRefreshToken()', () => {
    const verifier = (expected: boolean): ITokenDigester => ({
      digest(): Digest {
        return { value: Buffer.from('unused'), algo: 'sha256' }
      },
      verify(): boolean {
        return expected
      },
    })

    it('returns true when session active and verifier matches active token', () => {
      const s = Session.start({
        userId: base.userId,
        clientId: base.clientId,
        now: base.now,
        ttlSec: base.ttlSec,
        digest: { value: Buffer.from('x'), algo: 'sha256' },
        ip: base.ip,
        userAgent: base.userAgent,
      })
      expect(s.hasActiveRefreshToken(Buffer.from('plain'), verifier(true))).toBe(true)
    })

    it('returns false when session not active', () => {
      const s = Session.start({
        userId: base.userId,
        clientId: base.clientId,
        now: base.now,
        ttlSec: base.ttlSec,
        digest: { value: Buffer.from('x'), algo: 'sha256' },
        ip: base.ip,
        userAgent: base.userAgent,
      })
      s.revoke(new Date(base.now.getTime() + 1000), 'test')
      expect(s.hasActiveRefreshToken(Buffer.from('plain'), verifier(true))).toBe(false)
    })

    it('returns false when no active token exists', () => {
      const s = Session.start({
        userId: base.userId,
        clientId: base.clientId,
        now: base.now,
        ttlSec: base.ttlSec,
        digest: { value: Buffer.from('x'), algo: 'sha256' },
        ip: base.ip,
        userAgent: base.userAgent,
      })
      // Simulate no active token by revoking it via rotation misuse path: mark token revoked
      const token = s.tokens[0] as RefreshToken
      token.markRevoked()
      expect(s.hasActiveRefreshToken(Buffer.from('plain'), verifier(true))).toBe(false)
    })

    it('returns false when digest verification fails', () => {
      const s = Session.start({
        userId: base.userId,
        clientId: base.clientId,
        now: base.now,
        ttlSec: base.ttlSec,
        digest: { value: Buffer.from('x'), algo: 'sha256' },
        ip: base.ip,
        userAgent: base.userAgent,
      })
      expect(s.hasActiveRefreshToken(Buffer.from('plain'), verifier(false))).toBe(false)
    })
  })
})
