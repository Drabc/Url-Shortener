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
  refreshToken: Buffer<ArrayBufferLike>
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
   * Authenticates a user with the provided email and password, creates a new session and returns access and refresh tokens.
   * @param {string} email The user's email address.
   * @param {string} password The user's plain text password.
   * @param {FingerPrint} fingerPrint Fingerprint information identifying the client.
   * @returns {Promise<LoginResponse>} An object containing an accessToken (JWT) and a refreshToken (secret bytes).
   * @throws {InvalidCredentialsError} When the user doesn't exists or the password is incorrect.
   */
  async exec(email: string, password: string, fingerPrint: FingerPrint): Promise<LoginResponse> {
    const user = await this.userRepo.findByEmail(email)
    const now = this.clock.now()

    // Return auth error to prevent enumeration attack
    if (!user) throw new InvalidCredentialsError()

    if (!(await this.passwordHasher.verify(password, user.passwordHash)))
      throw new InvalidCredentialsError()

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
