import { IRefreshSecretGenerator } from '@application/ports/refresh-secret-generator.js'
import { IJwtIssuer } from '@application/ports/jwt-issuer.js'
import { Clock } from '@application/shared/clock.js'
import { FingerPrint } from '@application/dtos.js'
import { ISessionRepository } from '@domain/repositories/session.repository.interface.js'
import { ITokenDigester } from '@domain/utils/token-digester.js'
import { Session } from '@domain/entities/auth/session.js'

import { RefreshToken as RefreshTokenUC } from './refresh-token.use-case.js'

describe('RefreshToken.exec()', () => {
  let uc: RefreshTokenUC
  let sessionRepo: jest.Mocked<ISessionRepository>
  let digester: jest.Mocked<ITokenDigester>
  let secretGen: jest.Mocked<IRefreshSecretGenerator>
  let jwtIssuer: jest.Mocked<IJwtIssuer>
  let clock: jest.Mocked<Clock>

  const userId = 'user-1'
  const fp: FingerPrint = { clientId: 'desktop', ip: '1.1.1.1', rawUa: 'UA' }
  const now = new Date('2024-01-01T00:00:00Z')
  const presented = Buffer.from('refresh-raw')
  const presentedDigest = { value: Buffer.from('digest-bytes'), algo: 'hmac' }
  const newSecret = { value: Buffer.from('new-secret') }
  const newDigest = { value: Buffer.from('new-digest'), algo: 'hmac' }

  beforeEach(() => {
    sessionRepo = {
      findActiveByUserId: jest.fn(),
      findSessionForRefresh: jest.fn(),
      save: jest.fn(),
    }
    digester = {
      digest: jest
        .fn()
        .mockImplementation((buf: Buffer) => (buf === presented ? presentedDigest : newDigest)),
      verify: jest.fn().mockReturnValue(true),
    }
    secretGen = { generate: jest.fn().mockReturnValue(newSecret) }
    jwtIssuer = { issue: jest.fn().mockResolvedValue('access-jwt') }
    clock = { now: jest.fn().mockReturnValue(now) }
    uc = new RefreshTokenUC(sessionRepo, digester, secretGen, jwtIssuer, clock, 32)
  })

  /**
   * Helper to create a mock Session with overridable behavior.
   * @param {Partial<Session>} overrides Optional overrides for base session shape.
   * @returns {Session} Mock session instance.
   */
  function makeSession(overrides: Partial<Session> = {}): Session {
    return {
      userId,
      clientId: fp.clientId,
      status: 'active',
      tokens: [],
      rotateToken: jest.fn(() => ({ ok: true })),
      ...overrides,
    } as unknown as Session
  }

  it('successfully rotates and returns new tokens', async () => {
    const session = makeSession()
    sessionRepo.findSessionForRefresh.mockResolvedValue(session)
    const result = await uc.exec(fp, presented)
    expect(digester.digest).toHaveBeenCalledWith(presented)
    expect(session.rotateToken).toHaveBeenCalledWith(presented, newDigest, digester, now)
    expect(jwtIssuer.issue).toHaveBeenCalledWith(userId)
    expect(sessionRepo.save).toHaveBeenCalledWith(session)
    expect(result.ok).toBe(true)
    const success = result as Exclude<typeof result, { ok: false }>
    expect(success.value?.accessToken).toBe('access-jwt')
    expect(success.value?.refreshToken).toBe(newSecret.value)
  })

  it('returns application InvalidSession error when session not found', async () => {
    sessionRepo.findSessionForRefresh.mockResolvedValue(null)
    const result = await uc.exec(fp, presented)
    expect(result.ok).toBe(false)
    const err = (result as Exclude<typeof result, { ok: true }>).error
    expect(err.kind).toBe('application')
    expect(err.type).toBe('InvalidSession')
    expect(err.cause).toContain('not Found')
  })

  it('returns application InvalidSession error when client mismatch', async () => {
    const session = makeSession({ clientId: 'mobile' })
    sessionRepo.findSessionForRefresh.mockResolvedValue(session)
    const result = await uc.exec(fp, presented)
    expect(result.ok).toBe(false)
    const err = (result as Exclude<typeof result, { ok: true }>).error
    expect(err.kind).toBe('application')
    expect(err.type).toBe('InvalidSession')
    expect(err.cause).toContain('another device')
  })

  it('returns domain error when rotateResult indicates expired session', async () => {
    const session = makeSession({
      rotateToken: jest.fn(() => ({
        ok: false,
        error: { kind: 'domain', type: 'InvalidSession', cause: 'Expired session' },
      })),
    })
    sessionRepo.findSessionForRefresh.mockResolvedValue(session)
    const result = await uc.exec(fp, presented)
    expect(sessionRepo.save).toHaveBeenCalledWith(session)
    expect(result.ok).toBe(false)
    const err = (result as Exclude<typeof result, { ok: true }>).error
    expect(err.kind).toBe('domain')
    expect(err.type).toBe('InvalidSession')
    expect(err.cause).toContain('Expired')
  })

  it('returns domain error when rotateResult indicates reuse detected', async () => {
    const session = makeSession({
      rotateToken: jest.fn(() => ({
        ok: false,
        error: {
          kind: 'domain',
          type: 'InvalidSession',
          cause: 'Refresh token reuse detected',
        },
      })),
    })
    sessionRepo.findSessionForRefresh.mockResolvedValue(session)
    const result = await uc.exec(fp, presented)
    expect(sessionRepo.save).toHaveBeenCalledWith(session)
    expect(result.ok).toBe(false)
    const err = (result as Exclude<typeof result, { ok: true }>).error
    expect(err.cause).toContain('reuse')
  })

  it('returns domain error when rotateResult indicates no active token', async () => {
    const session = makeSession({
      rotateToken: jest.fn(() => ({
        ok: false,
        error: { kind: 'domain', type: 'InvalidSession', cause: 'No active refresh token' },
      })),
    })
    sessionRepo.findSessionForRefresh.mockResolvedValue(session)
    const result = await uc.exec(fp, presented)
    expect(sessionRepo.save).toHaveBeenCalledWith(session)
    expect(result.ok).toBe(false)
    const err = (result as Exclude<typeof result, { ok: true }>).error
    expect(err.cause).toContain('No active')
  })

  it('returns domain error when rotateResult indicates session not active', async () => {
    const session = makeSession({
      rotateToken: jest.fn(() => ({
        ok: false,
        error: { kind: 'domain', type: 'InvalidSession', cause: 'Session is not Active' },
      })),
    })
    sessionRepo.findSessionForRefresh.mockResolvedValue(session)
    const result = await uc.exec(fp, presented)
    expect(sessionRepo.save).toHaveBeenCalledWith(session)
    expect(result.ok).toBe(false)
    const err = (result as Exclude<typeof result, { ok: true }>).error
    expect(err.cause).toContain('not Active')
  })
})
