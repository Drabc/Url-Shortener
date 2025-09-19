import { Digest } from '@domain/utils/token-digester.js'
import { BaseEntity } from '@domain/entities/base-entity.js'

export type RefreshTokenStatus = 'active' | 'revoked' | 'expired' | 'reuse_detected' | 'rotated'

type NewRefreshTokenArgs = {
  sessionId: string
  userId: string
  hash: Buffer
  hashAlgo: string
  now: Date
  ttlSec: number
  ip?: string
  userAgent?: string
  previousTokenId?: string
}

type RefreshTokenHydrationArgs = {
  id: string
  sessionId: string
  userId: string
  hash: Buffer
  hashAlgo: string
  status: RefreshTokenStatus
  issuedAt: Date
  expiresAt: Date
  ip: string
  userAgent: string
  lastUsedAt: Date
  previousTokenId?: string
}

export const REFRESH_STATUSES: Record<RefreshTokenStatus, RefreshTokenStatus> = {
  active: 'active',
  rotated: 'rotated',
  revoked: 'revoked',
  expired: 'expired',
  reuse_detected: 'reuse_detected',
}

/**
 * Represents a refresh token with lifecycle status, issuance/expiry timestamps, and usage metadata.
 * @param {string} id Unique identifier
 * @param {string} sessionId Associated session identifier linking this token to a session.
 * @param {string} userId Owner user identifier.
 * @param {string} hash Hashed token value (never the raw token).
 * @param {string} hashAlgo Hash algorithm used.
 * @param {RefreshTokenStatus} _status Internal lifecycle status indicator.
 * @param {Date} issuedAt Timestamp when the token was issued.
 * @param {Date} expiresAt Expiration timestamp after which the token is invalid.
 * @param {string} [ip] Optional originating IP address.
 * @param {string} [userAgent] Optional user agent string from the client.
 * @param {Date} [_lastUsedAt] Optional last-used timestamp (set when rotated or reused).
 */
export class RefreshToken extends BaseEntity {
  /**
   * Create a new refresh token with active status and computed expiration.
   * @param {NewRefreshTokenArgs} args Token creation arguments including session/user ids,
   *  hash, algorithm, current time, TTL, and optional ip/userAgent.
   * @returns {RefreshToken} Newly created active refresh token.
   */
  static fresh(args: NewRefreshTokenArgs): RefreshToken {
    const expiresAt = new Date(args.now.getTime() + args.ttlSec * 1000)
    return new RefreshToken(
      '',
      args.sessionId,
      args.userId,
      args.hash,
      args.hashAlgo,
      REFRESH_STATUSES.active,
      args.now,
      expiresAt,
      args.now,
      args.ip,
      args.userAgent,
      args.previousTokenId,
    )
  }

  /**
   * Rehydrate an existing refresh token instance from data.
   * @param {RefreshTokenHydrationArgs} args refresh token data.
   * @returns {RefreshToken} Hydrated token instance.
   */
  static hydrate({
    id,
    sessionId,
    userId,
    hash,
    hashAlgo,
    status,
    issuedAt,
    expiresAt,
    ip,
    userAgent,
    lastUsedAt,
    previousTokenId,
  }: RefreshTokenHydrationArgs): RefreshToken {
    return new RefreshToken(
      id,
      sessionId,
      userId,
      hash,
      hashAlgo,
      status,
      issuedAt,
      expiresAt,
      lastUsedAt,
      ip,
      userAgent,
      previousTokenId,
    )
  }

  /**
   * Last time this refresh token was used (e.g., to obtain a new access token).
   * @returns {Date} Timestamp of last use.
   */
  get lastUsedAt(): Date {
    return this._lastUsedAt
  }

  /**
   * Identifier of the previous refresh token in the rotation chain, if any.
   * @returns {string | undefined} Previous token id or undefined if this is the first token.
   */
  get previousTokenId(): string | undefined {
    return this._previousTokenId
  }

  /**
   * Current lifecycle status of this refresh token.
   * @returns {RefreshTokenStatus} The status value.
   */
  get status(): RefreshTokenStatus {
    return this._status
  }

  public readonly digest: Digest

  private constructor(
    id: string,
    public readonly sessionId: string,
    public readonly userId: string,
    hash: Buffer,
    hashAlgo: string,
    private _status: RefreshTokenStatus,
    public readonly issuedAt: Date,
    public readonly expiresAt: Date,
    private _lastUsedAt: Date,
    public readonly ip?: string,
    public readonly userAgent?: string,
    private _previousTokenId?: string,
  ) {
    super(id)
    this.digest = { value: hash, algo: hashAlgo }
  }

  /**
   * Mark token as rotated (used to issue a subsequent token in the chain).
   * @param {Date} when Timestamp of rotation.
   */
  markRotated(when: Date) {
    this._status = REFRESH_STATUSES.rotated
    this._lastUsedAt = when
  }

  /**
   * Mark token as explicitly revoked (manual or security event) without reuse detection.
   */
  markRevoked() {
    this._status = REFRESH_STATUSES.revoked
  }

  /**
   * Mark token as compromised due to reuse detection.
   */
  markReused() {
    this._status = REFRESH_STATUSES.reuse_detected
  }

  /**
   * Mark token as expired after its expiration time passes.
   */
  markExpired() {
    this._status = REFRESH_STATUSES.expired
  }

  /**
   * Determine if this refresh token is currently active.
   * @returns {boolean} True if status is active.
   */
  isActive(): boolean {
    return this._status === REFRESH_STATUSES.active
  }
}
