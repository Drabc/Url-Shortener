import { Session } from '@domain/entities/auth/session.js'
import { SessionError } from '@domain/errors/repository.error.js'
import { AsyncResult } from '@shared/result.js'

export interface ISessionRepository {
  /**
   * Retrieve all currently active (non-expired) sessions for a given user.
   * Implementations may choose an ordering (e.g. most recently used first) but MUST exclude
   * expired sessions to avoid leaking stale refresh tokens into rotation / reuse logic.
   * @param {string} userId The user identifier whose active sessions should be returned.
   * @returns {Promise<Session[]>} Array of active session aggregates (possibly empty).
   */
  findActiveByUserId(userId: string): Promise<Session[]>
  /**
   * Find the session aggregate needed for a refresh attempt given the presented refresh token digest.
   * Implementations SHOULD return only the presented token and the current active token (if different)
   * along with core session fields; this is sufficient for rotation + reuse detection.
   * Returns null if the digest does not belong to any refresh token.
   * @param {Buffer} hash Raw digest bytes of the presented refresh token.
   */
  findSessionForRefresh(hash: Buffer): Promise<Session | null>
  /**
   * Persist a session aggregate.
   * Implementations should insert new sessions or update existing ones atomically so that
   * refresh token rotation and last-used timestamps are durable. Returns Err on persistence
   * failures (e.g., optimistic concurrency / storage layer issues) mapped to a SessionError type.
   * @param {Session} session The session aggregate to persist.
   * @returns {AsyncResult<void, SessionError>} Ok(void) on success or Err(SessionError) on failure.
   */
  save(session: Session): AsyncResult<void, SessionError>
}
