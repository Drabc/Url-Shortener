import { RefreshToken, RefreshTokenStatus } from '@domain/entities/auth/refresh-token.js'
import { Session, SessionRehydrateArgs, SessionStatus } from '@domain/entities/auth/session.js'
import { ISessionRepository } from '@domain/repositories/session.repository.interface.js'
import { PgClient } from '@infrastructure/clients/pg-client.js'

type SessionAggregateRow = {
  id: string
  user_id: string
  status: SessionStatus
  expires_at: string
  last_used_at: string
  client_id: string
  ip: string
  user_agent: string
  ended_at: string
  end_reason: string
  rt_id: string
  hash: Buffer
  hash_algo: string
  rt_status: RefreshTokenStatus
  rt_issued_at: string
  rt_ip: string
  rt_user_agent: string
  rt_last_used_at: string
  prev_token: string
}

/**
 * Postgres implementation of the session aggregate repository providing persistence for sessions and their refresh tokens.
 * @param client PostgreSQL client used to execute queries.
 */
export class PostgresSessionRepository implements ISessionRepository {
  constructor(private readonly client: PgClient) {}

  /**
   * Retrieves all active sessions for the specified user including their active refresh tokens.
   * @param {string} userId Identifier of the user whose active sessions should be returned.
   * @returns {Session[]} A promise resolving to an array of active Session aggregates.
   */
  async findActiveByUserId(userId: string): Promise<Session[]> {
    const query = `
      select s.id, s.user_id, s.status, s.expires_at, s.last_used_at, rt.id as rt_id, rt.hash, rt.hash_algo, rt.status as rt_status,
        rt.issued_at as rt_issued_at, rt.ip as rt_ip, rt.user_agent as rt_user_agent, rt.last_used_at as rt_last_used_at,
        rt.prev_token, s.ip, s.ended_at, s.end_reason, s.client_id
      from auth.sessions s
      join auth.refresh_tokens rt on rt.session_id = s.id
      where s.user_id = $1
      and s.status = 'active'
      and rt.status = 'active'
    `
    const rows = await this.client.findMany<SessionAggregateRow>(query, [userId])
    return this.toDomain(rows)
  }

  /**
   * Retrieves the session aggregate associated with the given refresh token hash including all action session refresh tokens.
   * @param {Buffer} hash Hash of the refresh token being used for rotation.
   * @returns {Session | null} Hydrated Session aggregate or null if not found.
   */
  async findSessionForRefresh(hash: Buffer): Promise<Session | null> {
    const query = `
      WITH activeSession AS (
        SELECT session_id
        FROM auth.refresh_tokens
        WHERE hash = $1
      )
      SELECT s.id, s.user_id, s.status, s.expires_at, s.last_used_at, s.client_id, s.ip, s.ended_at, s.end_reason,
             rt.id as rt_id, rt.hash, rt.hash_algo, rt.status as rt_status, rt.issued_at as rt_issued_at,
             rt.ip as rt_ip, rt.user_agent as rt_user_agent, rt.last_used_at as rt_last_used_at, rt.prev_token
      FROM activeSession ats
      JOIN auth.sessions s ON s.id = ats.session_id
      JOIN auth.refresh_tokens rt ON rt.session_id = s.id
      WHERE rt.hash = $1 OR rt.status = 'active'
    `
    const rows = await this.client.findMany<SessionAggregateRow>(query, [hash])
    if (!rows.length) return null
    const sessions = this.toDomain(rows)
    return sessions[0] ?? null
  }
  /**
   * Persists the session aggregate (session and its refresh tokens) using upsert semantics.
   * @param {Session} session Session aggregate to persist.
   * @returns {Promise<void>} Resolves when persistence completes.
   * @todo Wrap both INSERT ... ON CONFLICT operations in an explicit transaction for atomicity.
   */
  async save(session: Session): Promise<void> {
    // Add transaction
    const sessionQuery = `
      insert into auth.sessions (id, user_id, status, expires_at, last_used_at, client_id, ip, user_agent, ended_at, end_reason)
      values (COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10)
      on conflict (id) do update
      set status = excluded.status,
          last_used_at = excluded.last_used_at,
          client_id = excluded.client_id,
          ended_at = excluded.ended_at,
          end_reason = excluded.end_reason
      where auth.sessions.user_id = excluded.user_id
      returning id, (xmax = 0) as inserted
    `

    const { rows } = await this.client.query(sessionQuery, [
      session.id,
      session.userId,
      session.status,
      session.expiresAt,
      session.lastUsedAt,
      session.clientId,
      session.ip,
      session.userAgent,
      session.endedAt,
      session.endReason,
    ])

    const refreshTokenQuery = `
      with input as (
        select * from jsonb_to_recordset($1::jsonb) as t(
          id text,
          session_id uuid,
          user_id uuid,
          digest_value text,
          digest_algo text,
          status auth.refresh_status,
          previous_token_id uuid,
          issued_at timestamptz,
          last_used_at timestamptz,
          ip inet,
          user_agent text
        )
      )
      insert into auth.refresh_tokens (id, session_id, user_id, hash, hash_algo, status, prev_token, issued_at, last_used_at, ip, user_agent)
      select COALESCE(NULLIF(id, '')::uuid, gen_random_uuid()), session_id, user_id,
      decode(digest_value, 'base64'), digest_algo, status, previous_token_id, issued_at, last_used_at,
      ip, user_agent
      from input
      on conflict (id) do update
      set status = excluded.status,
          prev_token = excluded.prev_token,
          last_used_at = excluded.last_used_at
      where auth.refresh_tokens.session_id = excluded.session_id
      returning id, (xmax = 0) as inserted
    `

    const payload = JSON.stringify(
      session.tokens.map((token) => {
        return {
          id: token.id,
          session_id: rows[0].id,
          user_id: token.userId,
          digest_value: token.digest.value.toString('base64'),
          digest_algo: token.digest.algo,
          status: token.status,
          previous_token_id: token.previousTokenId,
          issued_at: token.issuedAt,
          last_used_at: token.lastUsedAt,
          ip: token.ip,
          user_agent: token.userAgent,
        }
      }),
    )

    await this.client.query(refreshTokenQuery, [payload])
  }

  /**
   * Converts raw session aggregate rows from the database into hydrated Session domain entities.
   * @param {SessionAggregateRow[]} rows Collection of session + refresh token joined rows from the database.
   * @returns {Session[]} Array of hydrated Session aggregates.
   * @todo This mapper can be abstracted if needed
   */
  private toDomain(rows: SessionAggregateRow[]): Session[] {
    let sessionArgs: SessionRehydrateArgs
    const sessionIdentityMap: Record<string, SessionRehydrateArgs> = {}

    for (let row of rows) {
      sessionArgs = sessionIdentityMap[row.id]
      if (!sessionArgs) {
        console.log(row.last_used_at)
        sessionArgs = {
          id: row.id,
          userId: row.user_id,
          status: row.status,
          lastUsedAt: new Date(row.last_used_at),
          expiresAt: new Date(row.expires_at),
          tokens: [],
          clientId: row.client_id,
          ip: row.ip,
          userAgent: row.user_agent,
          endedAt: new Date(row.ended_at),
          endReason: row.end_reason,
        }
        sessionIdentityMap[row.id] = sessionArgs
      }

      sessionArgs.tokens.push(
        RefreshToken.hydrate({
          id: row.rt_id,
          sessionId: row.id,
          userId: row.user_id, // This can be removed as well
          hash: row.hash,
          hashAlgo: row.hash_algo,
          status: row.rt_status,
          issuedAt: new Date(row.rt_issued_at),
          expiresAt: new Date(), // temporary. Probably don't need since it depends on session
          ip: row.rt_ip,
          userAgent: row.rt_user_agent,
          lastUsedAt: new Date(row.rt_last_used_at),
          previousTokenId: row.prev_token,
        }),
      )
    }

    return Object.values(sessionIdentityMap).map((sessionData) => {
      return Session.hydrate(sessionData)
    })
  }
}
