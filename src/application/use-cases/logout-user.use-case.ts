import { ISessionRepository } from '@domain/repositories/session.repository.interface.js'
import { Clock } from '@application/shared/clock.js'
import { FingerPrint } from '@application/dtos.js'
import { ITokenDigester } from '@domain/utils/token-digester.js'
import { all, AsyncResult, Ok } from '@shared/result.js'
import { AnyError } from '@shared/errors.js'

/**
 * Use case to handle user logout operations for single sessions or globally.
 * Responsibilities:
 * - Revoke a specific session matching a refresh token and client fingerprint.
 * - Revoke all active sessions for a user (global logout).
 *
 * Logout is idempotent when no refresh token is provided.
 * @param {ISessionRepository} sessionRepo Repository used to load and persist user sessions.
 * @param {ITokenDigester} tokenDigester Utility used for securely hashing and comparing refresh tokens.
 * @param {Clock} clock Clock abstraction used to obtain the current timestamp for revocations.
 */
export class LogoutUser {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly tokenDigester: ITokenDigester,
    private readonly clock: Clock,
  ) {}

  /**
   * Logout a user by revoking the specific session associated with the provided refresh token.
   * If no refresh token is provided, this operation is a no-op (idempotent).
   * @param {string} userId The user's unique identifier.
   * @param {FingerPrint} fingerPrint Fingerprint information identifying the client.
   * @param {Buffer} [refreshToken] The refresh token to revoke. If not provided, no action is taken.
   * @returns {AsyncResult<void, AnyError>} Promise that resolves when the logout operation completes.
   */
  async logoutSession(
    userId: string,
    fingerPrint: FingerPrint,
    refreshToken?: Buffer,
  ): AsyncResult<void, AnyError> {
    if (!refreshToken) {
      // No refresh token provided - logout is idempotent
      return Ok(undefined)
    }

    const now = this.clock.now()
    const activeSessions = await this.sessionRepo.findActiveByUserId(userId)

    for (const session of activeSessions) {
      if (
        session.clientId === fingerPrint.clientId &&
        session.hasActiveRefreshToken(refreshToken, this.tokenDigester)
      ) {
        session.revoke(now, 'user_logout')
        return await this.sessionRepo.save(session)
      }
    }

    return Ok(undefined)
  }

  /**
   * Logout a user from all active sessions globally.
   * This revokes all active sessions for the user across all devices/clients.
   * @param {string} userId The user's unique identifier.
   * @returns {AsyncResult<void, AnyError>} Promise that resolves when all sessions are revoked.
   */
  async logoutAllSessions(userId: string): AsyncResult<void, AnyError> {
    const now = this.clock.now()
    const activeSessions = await this.sessionRepo.findActiveByUserId(userId)

    for (const session of activeSessions) {
      session.revoke(now, 'global_logout')
    }

    const results = await Promise.all(
      activeSessions.map((session) => this.sessionRepo.save(session)),
    )

    return all(...results).andThen(() => Ok(undefined))
  }
}
