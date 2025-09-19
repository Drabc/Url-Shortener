import { Session } from '@domain/entities/auth/session.js'
import { IPasswordHasher } from '@application/ports/password-hasher.port.js'
import { ITokenDigester } from '@domain/utils/token-digester.js'
import { ISessionRepository } from '@domain/repositories/session.repository.interface.js'
import { IUserRepository } from '@domain/repositories/user.repository.interface.js'
import { IRefreshSecretGenerator } from '@application/ports/refresh-secret-generator.js'
import { FingerPrint } from '@application/dtos.js'
import { Clock } from '@application/shared/clock.js'
import { Config } from '@infrastructure/config/config.js'
import { IJwtIssuer } from '@application/ports/jwt-issuer.js'
import { InvalidCredentialsError } from '@application/errors/invalid-credentials.error.js'

type LoginResponse = {
  accessToken: string
  refreshToken: Buffer
}

/**
 * Use case to authenticate a user: verifies credentials, starts a session, and returns access and refresh tokens.
 * @param {IPasswordHasher} passwordHasher To verify the password
 * @param {ITokenDigester} tokenDigester used to
 */
export class LoginUser {
  constructor(
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenDigester: ITokenDigester,
    private readonly refreshSecretGenerator: IRefreshSecretGenerator,
    private readonly jwtIssuer: IJwtIssuer,
    private readonly sessionRepo: ISessionRepository,
    private readonly userRepo: IUserRepository,
    private readonly clock: Clock,
    private readonly config: Config,
  ) {}

  /**
   * Authenticates a user with the provided email and password. If a refresh token from the client corresponding to an
   * already active session (same user + clientId + active refresh token digest match) is supplied, the use case becomes
   * idempotent and simply issues a fresh access token without creating a new session / refresh token pair.
   * Otherwise it creates a brand new session with a new refresh token.
   *
   * Idempotent Path Conditions:
   *  - presentedRefreshToken is provided
   *  - An active session for the user exists whose clientId matches the provided fingerprint clientId
   *  - The active refresh token digest verifies against the presented plain refresh token
   *
   * Security Note: We additionally gate the match on clientId to reduce the blast radius of a stolen token.
   * @param {string} email The user's email address.
   * @param {string} password The user's plain text password.
   * @param {FingerPrint} fingerPrint Fingerprint information identifying the client.
   * @param {Buffer} [presentedRefreshToken] Optional refresh token previously issued for an active session.
   * @returns {Promise<LoginResponse>} An object containing an accessToken (JWT) and a refreshToken (secret bytes).
   * @throws {InvalidCredentialsError} When the user doesn't exists or the password is incorrect.
   */
  async exec(
    email: string,
    password: string,
    fingerPrint: FingerPrint,
    presentedRefreshToken?: Buffer,
  ): Promise<LoginResponse> {
    const user = await this.userRepo.findByEmail(email)
    const now = this.clock.now()

    // Return auth error to prevent enumeration attack
    if (!user) throw new InvalidCredentialsError()

    if (!(await this.passwordHasher.verify(password, user.passwordHash)))
      throw new InvalidCredentialsError()

    // Idempotent reuse path: If caller supplied a refresh token, attempt to locate an existing active session
    // for this user + client whose active token matches. If found, only a new access token is issued.
    if (presentedRefreshToken) {
      const activeSessions = await this.sessionRepo.findActiveByUserId(user.id)
      for (const s of activeSessions) {
        if (s.clientId !== fingerPrint.clientId) continue
        if (s.hasActiveRefreshToken(presentedRefreshToken, this.tokenDigester)) {
          const accessToken = await this.jwtIssuer.issue(user.id)
          return { accessToken, refreshToken: presentedRefreshToken }
        }
      }
    }

    const refreshToken = this.refreshSecretGenerator.generate(this.config.sessionSecretLength)
    const digest = this.tokenDigester.digest(refreshToken.value)

    const session = Session.start({
      userId: user.id,
      clientId: fingerPrint.clientId,
      now,
      ttlSec: this.config.sessionTtl,
      digest,
      ip: fingerPrint.ip,
      userAgent: fingerPrint.rawUa,
    })

    const accessToken = await this.jwtIssuer.issue(user.id)

    await this.sessionRepo.save(session)

    return { accessToken, refreshToken: refreshToken.value }
  }
}
