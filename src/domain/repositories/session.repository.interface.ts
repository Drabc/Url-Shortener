import { Session } from '@domain/entities/auth/session.js'

export interface ISessionRepository {
  findActiveByUserId(userId: string): Promise<Session[]>
  save(session: Session): Promise<void>
}
