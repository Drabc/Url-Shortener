import { PostgresSessionRepository } from '@infrastructure/repositories/session/postgres-session.repository.js'
import { PgClient } from '@infrastructure/clients/pg-client.js'
import { Session } from '@domain/entities/auth/session.js'
import { RefreshToken } from '@domain/entities/auth/refresh-token.js'
import { Digest } from '@domain/utils/token-digester.js'

/**
 * Creates a new Session (via factory) and optionally patches the id for testing.
 * @param {{ id?: string }} attrs Optional attributes.
 * @param {string} [attrs.id] Optional explicit id to assign for deterministic testing.
 * @returns {Session} Newly created session instance.
 */
function makeSession(attrs: { id?: string } = {}) {
  const now = new Date('2025-01-01T00:00:00.000Z')
  const digest: Digest = { value: Buffer.from('abcd', 'hex'), algo: 'sha256' }
  const base = Session.start({
    userId: 'user-1',
    clientId: 'client-1',
    now,
    ttlSec: 3600,
    digest,
    ip: '127.0.0.1',
    userAgent: 'jest',
  })
  if (attrs.id) (base as unknown as { id: string }).id = attrs.id
  return base
}

describe('PostgresSessionRepository', () => {
  let pg: { findMany: jest.Mock; query: jest.Mock }
  let repo: PostgresSessionRepository

  beforeEach(() => {
    pg = { findMany: jest.fn(), query: jest.fn() }
    repo = new PostgresSessionRepository(pg as unknown as PgClient)
  })

  describe('findActiveByUserId()', () => {
    it('returns empty array when no rows', async () => {
      pg.findMany.mockResolvedValue([])
      const result = await repo.findActiveByUserId('user-1')
      expect(result).toEqual([])
      expect(pg.findMany).toHaveBeenCalledTimes(1)
    })

    it('maps a single row to one Session with one RefreshToken', async () => {
      const row = {
        id: 'sess-1',
        user_id: 'user-1',
        status: 'active',
        expires_at: '2025-01-01T01:00:00.000Z',
        last_used_at: '2025-01-01T00:00:00.000Z',
        client_id: 'client-1',
        ip: '127.0.0.1',
        user_agent: 'ua',
        ended_at: '2025-01-01T02:00:00.000Z',
        end_reason: 'expired',
        rt_id: 'rt-1',
        hash: Buffer.from('abcd', 'hex'),
        hash_algo: 'sha256',
        rt_status: 'active',
        rt_issued_at: '2025-01-01T00:00:00.000Z',
        rt_ip: '127.0.0.1',
        rt_user_agent: 'ua-rt',
        rt_last_used_at: '2025-01-01T00:10:00.000Z',
        prev_token: null,
      }
      pg.findMany.mockResolvedValue([row])

      const [session] = await repo.findActiveByUserId('user-1')
      expect(session).toBeInstanceOf(Session)
      expect(session.id).toBe('sess-1')
      expect(session.userId).toBe('user-1')
      expect(session.tokens.length).toBe(1)
      const token = session.tokens[0]
      expect(token.id).toBe('rt-1')
      expect(token.status).toBe('active')
      expect(token.digest.value).toEqual(Buffer.from('abcd', 'hex'))
      expect(token.digest.algo).toBe('sha256')
    })

    it('groups multiple rows for same session into single aggregate with multiple tokens', async () => {
      const baseRow = {
        id: 'sess-1',
        user_id: 'user-1',
        status: 'active',
        expires_at: '2025-01-01T01:00:00.000Z',
        last_used_at: '2025-01-01T00:00:00.000Z',
        client_id: 'client-1',
        ip: '127.0.0.1',
        user_agent: 'ua',
        ended_at: '2025-01-01T02:00:00.000Z',
        end_reason: 'expired',
      }
      const row1 = {
        ...baseRow,
        rt_id: 'rt-1',
        hash: Buffer.from('aaaa', 'hex'),
        hash_algo: 'sha256',
        rt_status: 'active',
        rt_issued_at: '2025-01-01T00:00:00.000Z',
        rt_ip: '127.0.0.1',
        rt_user_agent: 'ua-rt1',
        rt_last_used_at: '2025-01-01T00:05:00.000Z',
        prev_token: null,
      }
      const row2 = {
        ...baseRow,
        rt_id: 'rt-2',
        hash: Buffer.from('bbbb', 'hex'),
        hash_algo: 'sha256',
        rt_status: 'rotated',
        rt_issued_at: '2025-01-01T00:10:00.000Z',
        rt_ip: '127.0.0.1',
        rt_user_agent: 'ua-rt2',
        rt_last_used_at: '2025-01-01T00:15:00.000Z',
        prev_token: 'rt-1',
      }
      pg.findMany.mockResolvedValue([row1, row2])

      const sessions = await repo.findActiveByUserId('user-1')
      expect(sessions.length).toBe(1)
      const session = sessions[0]
      expect(session.tokens.length).toBe(2)
      const [t1, t2] = session.tokens
      expect(t1.id).toBe('rt-1')
      expect(t2.id).toBe('rt-2')
      expect(t2.previousTokenId).toBe('rt-1')
    })
  })

  describe('save()', () => {
    it('inserts session and its tokens', async () => {
      const session = makeSession()
      const secondToken = RefreshToken.fresh({
        sessionId: session.id,
        userId: session.userId,
        hash: Buffer.from('beef', 'hex'),
        hashAlgo: 'sha256',
        now: new Date('2025-01-01T00:30:00.000Z'),
        ttlSec: 1800,
        ip: '127.0.0.1',
        userAgent: 'jest2',
        previousTokenId: (session.tokens[0] as RefreshToken).id || undefined,
      })
      ;(session as unknown as { _tokens: RefreshToken[] })._tokens.push(secondToken)

      // First query returns the session id
      pg.query.mockResolvedValueOnce({ rows: [{ id: 'sess-new', inserted: true }] })
      // Second query for tokens
      pg.query.mockResolvedValueOnce({ rows: [] })

      const res = await repo.save(session)
      expect(res.ok).toBe(true)

      expect(pg.query).toHaveBeenCalledTimes(2)
      const firstCall = pg.query.mock.calls[0]
      expect(firstCall[0]).toContain('insert into auth.sessions')

      const secondCall = pg.query.mock.calls[1]
      expect(secondCall[0]).toContain('insert into auth.refresh_tokens')
      // Payload is argument index 1 => [payload]
      const payloadJson = secondCall[1][0]
      const parsed = JSON.parse(payloadJson)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBe(2)
      // Ensure required shape
      const keys = Object.keys(parsed[0])
      expect(keys).toEqual(
        expect.arrayContaining([
          'id',
          'session_id',
          'user_id',
          'digest_value',
          'digest_algo',
          'status',
          'issued_at',
          'last_used_at',
          'ip',
          'user_agent',
        ]),
      )
    })

    it('updates existing session (xmax != 0 path)', async () => {
      const session = makeSession()
      // simulate pg returning update (inserted=false)
      pg.query.mockResolvedValueOnce({ rows: [{ id: 'sess-existing', inserted: false }] })
      pg.query.mockResolvedValueOnce({ rows: [] })

      const res = await repo.save(session)
      expect(res.ok).toBe(true)

      expect(pg.query).toHaveBeenCalledTimes(2)
      expect(pg.query.mock.calls[0][0]).toContain('on conflict (id) do update')
    })
  })
})
