import { ISessionRepository } from '@domain/repositories/session.repository.interface.js'
import { ITokenDigester } from '@domain/utils/token-digester.js'
import { IRefreshSecretGenerator } from '@application/ports/refresh-secret-generator.js'
import { IJwtIssuer } from '@application/ports/jwt-issuer.js'
import { Clock } from '@application/shared/clock.js'
import { FingerPrint } from '@application/dtos.js'
import { AsyncResult, Err, Ok } from '@shared/result.js'
import { AnyError, errorFactory } from '@shared/errors.js'

type RefreshResult = { accessToken: string; refreshToken: Buffer; expirationDate: Date }

/**
 * Application use case responsible for rotating a refresh token and issuing a new access token.
 * Validates session ownership (user + device), rotates the persisted refresh token secret and returns new credentials.
 * @param {ISessionRepository} sessionRepo Repository for loading and persisting user sessions.
 * @param {ITokenDigester} tokenDigester Utility to digest (hash) refresh token secrets.
 * @param {IRefreshSecretGenerator} refreshSecretGenerator Generator that produces new refresh token secrets.
 * @param {IJwtIssuer} jwtIssuer Service that issues signed JWT access tokens.
 * @param {Clock} clock Time source used to timestamp rotation operations.
 * @param {number} sessionSecretLength Length (in bytes) for newly generated refresh token secrets.
 */
export class RefreshToken {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly tokenDigester: ITokenDigester,
    private readonly refreshSecretGenerator: IRefreshSecretGenerator,
    private readonly jwtIssuer: IJwtIssuer,
    private readonly clock: Clock,
    private readonly sessionSecretLength: number,
  ) {}

  /**
   * Execute refresh flow.
   * @param {FingerPrint} fingerPrint Fingerprint collected from request.
   * @param {Buffer} presentedRefreshToken Plain refresh token from cookie.
   * @returns {AsyncResult<RefreshResult, AnyError>} New access token + rotated refresh token.
   */
  async exec(
    fingerPrint: FingerPrint,
    presentedRefreshToken: Buffer,
  ): AsyncResult<RefreshResult, AnyError> {
    const now = this.clock.now()

    const presentedDigest = this.tokenDigester.digest(presentedRefreshToken)
    const session = await this.sessionRepo.findSessionForRefresh(presentedDigest.value)
    const invalidSessionResponse = (cause: string) =>
      Err(errorFactory.app('InvalidSession', 'unauthorized', { cause }))

    if (!session) return invalidSessionResponse('Session not Found')

    if (session.clientId !== fingerPrint.clientId)
      return invalidSessionResponse('Session belongs to another device')

    const newPlainSecret = this.refreshSecretGenerator.generate(this.sessionSecretLength)
    const newDigest = this.tokenDigester.digest(newPlainSecret.value)

    const saveResult = await session
      .rotateToken(presentedRefreshToken, newDigest, this.tokenDigester, now)
      .andThenAsync(() => this.sessionRepo.save(session))

    return saveResult.andThenAsync(async () => {
      const accessToken = await this.jwtIssuer.issue(session.userId)
      return Ok({
        accessToken,
        refreshToken: newPlainSecret.value,
        expirationDate: session.expiresAt,
      })
    })
  }
}
