import { RefreshToken } from '@domain/entities/auth/refresh-token.js'
import { Digest, ITokenDigester } from '@domain/utils/token-digester.js'
import { BaseEntity } from '@domain/entities/base-entity.js'
import {
  SessionNotActiveError,
  NoActiveRefreshTokenError,
  SessionExpiredError,
  RefreshTokenReuseDetectedError,
} from '@domain/errors/session.errors.js'

export type SessionStatus = 'active' | 'revoked' | 'expired' | 'reuse_detected'

type NewSessionArgs = {
  userId: string
  clientId: string
  now: Date
  ttlSec: number
  digest: Digest
  ip?: string
  userAgent?: string
}

export type SessionRehydrateArgs = {
  id: string
  userId: string
  clientId: string
  status: SessionStatus
  lastUsedAt: Date
  expiresAt: Date
  tokens: RefreshToken[]
  ip?: string
  userAgent?: string
  endedAt?: Date
  endReason?: string
}

const STATUSES: Record<SessionStatus, SessionStatus> = {
  active: 'active',
  revoked: 'revoked',
  expired: 'expired',
  reuse_detected: 'reuse_detected',
}

const END_REASONS = {
  expired: 'expired',
  reuse_detected: 'token_reuse_detected',
  inactive: 'no_active_token',
}

/**
 * Represents a user session including lifecycle state, timestamps, and metadata.
 * @param {string} id - Unique identifier for the session.
 * @param {string} userId - Identifier of the user owning the session.
 * @param {string} clientId - Identifier for the client/device.
 * @param {Date} expiresAt - Timestamp when the session expires.
 * @param {SessionStatus} status - Current status of the session.
 * @param {string} [ip] - IP address from which the session was created.
 * @param {string} [userAgent] - User agent string of the client.
 * @param {Date} [lastUsedAt] - Timestamp when the session was last used.
 * @param {Date} [revokedAt] - Timestamp when the session was revoked, if applicable.
 * @param {string} [revokedReason] - Reason for revocation, if applicable.
 */
export class Session extends BaseEntity {
  /**
   * Create a new session starting at the provided time with the given TTL.
   * @param {NewSessionArgs} args Object containing userId, clientId, now (current time),
   *  ttlSec (time-to-live in seconds), and optional ip/userAgent.
   * @returns {Session} A new Session instance initialized with active status and
   *  computed expiration time.
   */
  static start({ userId, clientId, now, ttlSec, digest, ip, userAgent }: NewSessionArgs): Session {
    const expiresAt = new Date(now.getTime() + ttlSec * 1000)
    const newToken = RefreshToken.fresh({
      sessionId: '',
      userId: userId,
      hash: digest.value,
      hashAlgo: digest.algo,
      now: now,
      ttlSec: ttlSec,
      ip: ip,
      userAgent: userAgent,
    })

    return new Session(
      '',
      userId,
      clientId,
      expiresAt,
      STATUSES.active,
      [newToken],
      ip,
      userAgent,
      now,
    )
  }

  /**
   * Rehydrate an existing session from data.
   * @param {SessionRehydrateArgs} args Object containing full session state including id,
   *  user/client identifiers, status, timestamps, and optional metadata.
   * @returns {Session} A Session instance.
   */
  static hydrate({
    id,
    userId,
    clientId,
    status,
    lastUsedAt,
    expiresAt,
    tokens,
    ip,
    userAgent,
    endedAt,
    endReason,
  }: SessionRehydrateArgs): Session {
    return new Session(
      id,
      userId,
      clientId,
      expiresAt,
      status,
      tokens,
      ip,
      userAgent,
      lastUsedAt,
      endedAt,
      endReason,
      false,
    )
  }

  /**
   * Get the timestamp when the session was last used.
   * @returns {Date | undefined} Date of last usage or undefined if never used.
   */
  get lastUsedAt(): Date | undefined {
    return this._lastUsedAt
  }

  /**
   * Get the timestamp when the session was revoked.
   * @returns {Date | undefined} Revocation timestamp or undefined if not revoked.
   */
  get endedAt(): Date | undefined {
    return this._endedAt
  }

  /**
   * Get the reason the session was revoked.
   * @returns {string | undefined} Revocation reason or undefined if not revoked.
   */
  get endReason(): string | undefined {
    return this._endReason
  }

  /**
   * Get the current status of the session.
   * @returns {SessionStatus} Current session status.
   */
  get status(): SessionStatus {
    return this._status
  }

  /**
   * Get all refresh tokens associated with this session, ordered by issuance (oldest first).
   * @returns {RefreshToken[]} Immutable list of refresh tokens for the session.
   */
  get tokens(): readonly RefreshToken[] {
    return this._tokens
  }

  private constructor(
    id: string,
    public readonly userId: string,
    public readonly clientId: string,
    public readonly expiresAt: Date,
    private _status: SessionStatus,
    private _tokens: RefreshToken[],
    public readonly ip?: string,
    public readonly userAgent?: string,
    private _lastUsedAt?: Date,
    private _endedAt?: Date,
    private _endReason?: string,
    isNew = true,
  ) {
    super(id, isNew)
  }

  /**
   * Update the lastUsedAt timestamp to the provided time.
   * @param {Date} now - The current timestamp to record as last used.
   */
  touch(now: Date) {
    this._lastUsedAt = now
  }

  /**
   * Rotate the currently active refresh token, validating session status, expiration, and reuse attempts.
   * Throws specific errors when rotation is not permitted or security issues are detected.
   * @param {Buffer} presentedPlain Plain buffer refresh token presented by the client.
   * @param {Digest} newDigest Digest (hash + algorithm) for the newly issued refresh token.
   * @param {ITokenDigester} verifier Token digester used to verify the presented token against stored digest.
   * @param {Date} now The current time.
   * @throws {SessionNotActiveError} If the session is not active.
   * @throws {NoActiveRefreshTokenError} If no active refresh token exists for rotation.
   * @throws {SessionExpiredError} If the session has expired.
   * @throws {RefreshTokenReuseDetectedError} If token reuse (mismatch) is detected.
   */
  rotateToken(presentedPlain: Buffer, newDigest: Digest, verifier: ITokenDigester, now: Date) {
    const activeToken = this._tokens.find((t) => t.isActive())

    if (this._status !== STATUSES.active) {
      throw new SessionNotActiveError()
    }

    if (!activeToken) {
      this.revoke(now, END_REASONS.inactive)
      throw new NoActiveRefreshTokenError()
    }

    if (this.expiresAt <= now) {
      this.markExpired(now)
      activeToken.markRevoked()
      throw new SessionExpiredError()
    }

    if (!verifier.verify(presentedPlain, activeToken.digest)) {
      this.markReuseDetected(now)
      activeToken.markReused()
      throw new RefreshTokenReuseDetectedError()
    }

    const newToken = RefreshToken.fresh({
      sessionId: this.id,
      userId: this.userId,
      hash: newDigest.value,
      hashAlgo: newDigest.algo,
      now: now,
      ttlSec: Math.floor((this.expiresAt.getTime() - now.getTime()) / 1000),
      ip: this.ip,
      userAgent: this.userAgent,
      previousTokenId: activeToken.id,
    })

    activeToken.markRotated(now)
    this._tokens.push(newToken)
  }

  /**
   * Determine whether the presented plain refresh token matches the currently active refresh token
   * (by verifying its digest) while the session itself is still active. This is a non-mutating check
   * used for idempotent login flows where rotation is not desired.
   * @param {Buffer} presentedPlain Plain (undigested) refresh token provided by the client.
   * @param {ITokenDigester} verifier Token digester used to verify the presented token against stored digest.
   * @returns {boolean} True if session status is active, an active refresh token exists, and digest verification succeeds.
   */
  hasActiveRefreshToken(presentedPlain: Buffer, verifier: ITokenDigester): boolean {
    if (this._status !== STATUSES.active) return false
    const activeToken = this._tokens.find((t) => t.isActive())
    if (!activeToken) return false
    return verifier.verify(presentedPlain, activeToken.digest)
  }

  /**
   * Revoke the session, updating status, timestamp, and reason.
   * @param {Date} now - Current timestamp when revocation occurs.
   * @param {string} reason - Explanation for revocation.
   */
  revoke(now: Date, reason: string) {
    if (this._status === STATUSES.revoked) {
      return
    }
    this._status = STATUSES.revoked
    this._endedAt = now
    this._endReason = reason
  }

  /**
   * Mark the session as revoked due to token reuse detection.
   * Sets status to reuse_detected and records revocation timestamp and reason.
   * @param {Date} now - Current timestamp when reuse was detected.
   */
  private markReuseDetected(now: Date) {
    this._status = STATUSES.reuse_detected
    this._endedAt = now
    this._endReason = END_REASONS.reuse_detected
  }

  /**
   * Mark the session as expired.
   * Sets status to expired and records the timestamp and end reason.
   * @param {Date} now - Current timestamp when the session is marked expired.
   */
  private markExpired(now: Date) {
    this._status = STATUSES.expired
    this._endedAt = now
    this._endReason = END_REASONS.expired
  }
}
