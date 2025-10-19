import { LoginUser } from '@application/use-cases/login-user.use-case.js'
import { Ok } from '@shared/result.js'
import { IUserRepository } from '@domain/repositories/user.repository.interface.js'
import { ISessionRepository } from '@domain/repositories/session.repository.interface.js'
import { IPasswordHasher } from '@application/ports/password-hasher.port.js'
import { ITokenDigester } from '@domain/utils/token-digester.js'
import { IRefreshSecretGenerator } from '@application/ports/refresh-secret-generator.js'
import { IJwtIssuer } from '@application/ports/jwt-issuer.js'
import { FingerPrint } from '@application/dtos.js'
import { User } from '@domain/entities/user.js'
import { Email } from '@domain/value-objects/email.js'
import { Session } from '@domain/entities/auth/session.js'
import { RefreshToken } from '@domain/entities/auth/refresh-token.js'

type Success<T> = T & { ok: true }
type Failure<T> = Exclude<T, { ok: true }>

/**
 * Tests for the LoginUser use case including newly added idempotent behavior when a refresh token is re-presented.
 */
describe('LoginUser.exec()', () => {
  let passwordHasher: jest.Mocked<IPasswordHasher>
  let tokenDigester: jest.Mocked<ITokenDigester>
  let refreshSecretGenerator: jest.Mocked<IRefreshSecretGenerator>
  let jwtIssuer: jest.Mocked<IJwtIssuer>
  let sessionRepo: jest.Mocked<ISessionRepository>
  let userRepo: jest.Mocked<IUserRepository>
  let clock: { now: jest.Mock }
  let config: { sessionSecretLength: number; sessionTtl: number }
  let useCase: LoginUser

  const fingerPrint: FingerPrint = {
    clientId: 'client-1',
    ip: '127.0.0.1',
    rawUa: 'jest-test',
  }

  // Pre-create a valid email and user using Success/Failure narrowing (no throws)
  const emailRes = Email.create('user@example.com')
  const email = (emailRes as Success<typeof emailRes>).value
  const userRes = User.create('user-1', 'First', 'Last', email, 'hash', new Date())
  const user = (userRes as Success<typeof userRes>).value

  beforeEach(() => {
    passwordHasher = { hash: jest.fn(), verify: jest.fn() }
    tokenDigester = { digest: jest.fn(), verify: jest.fn() }
    refreshSecretGenerator = { generate: jest.fn() }
    jwtIssuer = { issue: jest.fn() }
    sessionRepo = {
      findActiveByUserId: jest.fn(),
      findSessionForRefresh: jest.fn(),
      save: jest.fn(),
    }
    userRepo = { findById: jest.fn(), findByEmail: jest.fn(), save: jest.fn() }
    clock = { now: jest.fn() }
    config = { sessionSecretLength: 64, sessionTtl: 3600 }
    useCase = new LoginUser(
      passwordHasher,
      tokenDigester,
      refreshSecretGenerator,
      jwtIssuer,
      sessionRepo,
      userRepo,
      clock as { now: () => Date },
      {
        sessionSecretLength: config.sessionSecretLength,
        sessionTtl: config.sessionTtl,
      } as unknown as import('@infrastructure/config/config.js').Config,
    )
    // default save mock returns successful Result
    sessionRepo.save.mockResolvedValue(Ok(undefined))
  })

  it('creates new session when no presented refresh token', async () => {
    userRepo.findByEmail.mockResolvedValue(Ok(user))
    passwordHasher.verify.mockResolvedValue(true)
    const now = new Date('2025-01-01T00:00:00.000Z')
    clock.now.mockReturnValue(now)

    const generatedSecret = { value: Buffer.from('secret') }
    refreshSecretGenerator.generate.mockReturnValue(generatedSecret)
    tokenDigester.digest.mockReturnValue({ value: Buffer.from('digest'), algo: 'sha256' })
    jwtIssuer.issue.mockResolvedValue('jwt-access')

    const result = await useCase.exec('user@example.com', 'password', fingerPrint)
    const okResult = result as Success<typeof result>

    expect(okResult.ok).toBe(true)
    expect(okResult.value.accessToken).toBe('jwt-access')
    expect(okResult.value.refreshToken).toBe(generatedSecret.value)
    expect(okResult.value.expirationDate instanceof Date).toBe(true)
    expect(sessionRepo.save).toHaveBeenCalledTimes(1)
  })

  it('returns existing access (idempotent path) when presented refresh token matches active session token', async () => {
    userRepo.findByEmail.mockResolvedValue(Ok(user))
    passwordHasher.verify.mockResolvedValue(true)
    const now = new Date('2025-01-01T00:00:00.000Z')
    clock.now.mockReturnValue(now)

    const activeSession = Session.start({
      userId: user.id,
      clientId: fingerPrint.clientId,
      now,
      ttlSec: 3600,
      digest: { value: Buffer.from('digest'), algo: 'sha256' },
      ip: fingerPrint.ip,
      userAgent: fingerPrint.rawUa,
    })

    // Use internal mutation to ensure token digest aligns (simulate persisted state)
    const activeToken = activeSession.tokens[0] as RefreshToken

    sessionRepo.findActiveByUserId.mockResolvedValue([activeSession])
    jwtIssuer.issue.mockResolvedValue('jwt-existing-access')
    tokenDigester.verify.mockReturnValue(true)

    const presented = Buffer.from('plain-refresh')

    const result = await useCase.exec('user@example.com', 'password', fingerPrint, presented)
    expect(result.ok).toBe(true)
    const okResult = result as Success<typeof result>
    expect(okResult.value.accessToken).toBe('jwt-existing-access')
    expect(okResult.value.refreshToken).toBe(presented)
    expect(okResult.value.expirationDate.toISOString()).toBe(activeSession.expiresAt.toISOString())
    expect(sessionRepo.save).not.toHaveBeenCalled()
    expect(jwtIssuer.issue).toHaveBeenCalledTimes(1)
    expect(tokenDigester.verify).toHaveBeenCalledWith(presented, activeToken.digest)
  })

  it('falls back to new session when presented refresh token does not match digest', async () => {
    userRepo.findByEmail.mockResolvedValue(Ok(user))
    passwordHasher.verify.mockResolvedValue(true)
    const now = new Date('2025-01-01T00:00:00.000Z')
    clock.now.mockReturnValue(now)

    const activeSession = Session.start({
      userId: user.id,
      clientId: fingerPrint.clientId,
      now,
      ttlSec: 3600,
      digest: { value: Buffer.from('digest1'), algo: 'sha256' },
      ip: fingerPrint.ip,
      userAgent: fingerPrint.rawUa,
    })

    sessionRepo.findActiveByUserId.mockResolvedValue([activeSession])
    tokenDigester.verify.mockReturnValue(false)

    const generatedSecret = { value: Buffer.from('new-secret') }
    refreshSecretGenerator.generate.mockReturnValue(generatedSecret)
    tokenDigester.digest.mockReturnValue({ value: Buffer.from('digest2'), algo: 'sha256' })
    jwtIssuer.issue.mockResolvedValue('jwt-new-access')

    const presented = Buffer.from('mismatch-token')

    const result = await useCase.exec('user@example.com', 'password', fingerPrint, presented)
    expect(result.ok).toBe(true)
    const okResult = result as Success<typeof result>
    expect(okResult.value.accessToken).toBe('jwt-new-access')
    expect(okResult.value.refreshToken).toBe(generatedSecret.value)
    expect(okResult.value.expirationDate instanceof Date).toBe(true)
    expect(sessionRepo.save).toHaveBeenCalledTimes(1)
  })

  it('ignores sessions from other clients when attempting idempotent path', async () => {
    userRepo.findByEmail.mockResolvedValue(Ok(user))
    passwordHasher.verify.mockResolvedValue(true)
    const now = new Date('2025-01-01T00:00:00.000Z')
    clock.now.mockReturnValue(now)

    const otherClientSession = Session.start({
      userId: user.id,
      clientId: 'client-2',
      now,
      ttlSec: 3600,
      digest: { value: Buffer.from('digest'), algo: 'sha256' },
      ip: fingerPrint.ip,
      userAgent: fingerPrint.rawUa,
    })

    sessionRepo.findActiveByUserId.mockResolvedValue([otherClientSession])
    tokenDigester.verify.mockReturnValue(true) // would match if clientId were same

    const generatedSecret = { value: Buffer.from('brand-new') }
    refreshSecretGenerator.generate.mockReturnValue(generatedSecret)
    tokenDigester.digest.mockReturnValue({ value: Buffer.from('digestX'), algo: 'sha256' })
    jwtIssuer.issue.mockResolvedValue('jwt-brand-new')

    const result = await useCase.exec(
      'user@example.com',
      'password',
      fingerPrint,
      Buffer.from('any'),
    )
    expect(result.ok).toBe(true)
    const okResult = result as Success<typeof result>
    expect(okResult.value.accessToken).toBe('jwt-brand-new')
    expect(okResult.value.refreshToken).toBe(generatedSecret.value)
    expect(okResult.value.expirationDate instanceof Date).toBe(true)
    expect(sessionRepo.save).toHaveBeenCalledTimes(1)
  })

  it('returns InvalidCredentials error when user not found', async () => {
    userRepo.findByEmail.mockResolvedValue(Ok(null))

    const res = await useCase.exec('missing@example.com', 'password', fingerPrint)
    expect(res.ok).toBe(false)
    const failure: Failure<typeof res> = res as Failure<typeof res>
    expect(failure.error.kind).toBe('application')
    expect(failure.error.type).toBe('InvalidCredentials')
  })

  it('returns InvalidCredentials error when password invalid', async () => {
    userRepo.findByEmail.mockResolvedValue(Ok(user))
    passwordHasher.verify.mockResolvedValue(false)

    const res = await useCase.exec('user@example.com', 'bad', fingerPrint)
    expect(res.ok).toBe(false)
    const failure: Failure<typeof res> = res as Failure<typeof res>
    expect(failure.error.kind).toBe('application')
    expect(failure.error.type).toBe('InvalidCredentials')
  })
})
