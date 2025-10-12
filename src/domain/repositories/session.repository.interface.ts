import { Session } from '@domain/entities/auth/session.js'

export interface ISessionRepository {
  findActiveByUserId(userId: string): Promise<Session[]>
  /**
   * Find the session aggregate needed for a refresh attempt given the presented refresh token digest.
   * Implementations SHOULD return only the presented token and the current active token (if different)
   * along with core session fields; this is sufficient for rotation + reuse detection.
   * Returns null if the digest does not belong to any refresh token.
   * @param {Buffer} hash Raw digest bytes of the presented refresh token.
   */
  findSessionForRefresh(hash: Buffer): Promise<Session | null>
  save(session: Session): Promise<void>
}
