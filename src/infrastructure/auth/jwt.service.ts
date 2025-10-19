import { randomUUID } from 'crypto'

import { CryptoKey, JWTPayload, SignJWT, jwtVerify } from 'jose'
import { Logger } from 'pino'

import { IJwtIssuer } from '@application/ports/jwt-issuer.js'
import { Clock } from '@application/shared/clock.js'
import { IJwtVerifier, VerifiedJwt } from '@application/ports/jwt-verifier.js'
import { errorFactory } from '@shared/errors.js'
import { AsyncResult, Err, Ok, Result } from '@shared/result.js'
import { InvalidAccessToken } from '@application/errors/index.js'

/**
 * Service responsible for issuing and verifying JSON Web Tokens (JWT).
 * @param issuer Issuer (iss) claim value applied to issued tokens.
 * @param audience Audience (aud) claim value applied to issued tokens.
 * @param algo JWS signing algorithm identifier.
 * @param ttl Token time-to-live passed to setExpirationTime.
 * @param privateKey Private key used to sign tokens.
 * @param publicKey Public key used to verify tokens.
 * @param clock Clock abstraction providing deterministic times.
 * @param logger Logger instance for diagnostic events.
 * @param verifier Verification function (overridable for testing).
 * @param idGenerator UUID generator used for the jti claim.
 */
export class JwtService implements IJwtIssuer, IJwtVerifier {
  constructor(
    private readonly issuer: string,
    private readonly audience: string,
    private readonly algo: string,
    private readonly ttl: number,
    private readonly privateKey: CryptoKey,
    private readonly publicKey: CryptoKey,
    private readonly clock: Clock,
    private readonly logger: Logger,
    private readonly verifier: typeof jwtVerify = jwtVerify,
    private readonly idGenerator: typeof randomUUID = randomUUID,
  ) {}

  /**
   * Issues a signed JWT for the provided user id.
   * @param {string} userId User identifier to set as the subject (sub) claim.
   * @returns {Promise<string>} A promise that resolves to the signed JWT string.
   */
  issue(userId: string): Promise<string> {
    const now = this.clock.now()
    const expirationTime = new Date(now.getTime() + this.ttl * 1000)
    return new SignJWT()
      .setProtectedHeader({ alg: this.algo })
      .setIssuedAt(now)
      .setExpirationTime(expirationTime)
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setSubject(userId)
      .setJti(this.idGenerator())
      .sign(this.privateKey)
  }

  /**
   * Verifies a JWT string and returns its validated claims or null if invalid.
   * @param {string} jwt JSON Web Token string to verify.
   * @returns {Promise<VerifiedJwt | null>} Parsed and validated JWT payload or null if verification fails.
   */
  async verify(jwt: string): AsyncResult<VerifiedJwt | null, InvalidAccessToken> {
    try {
      const { payload } = await this.verifier(jwt, this.publicKey)

      return this.validateToken(payload).andThen(() => {
        return Ok({
          subject: payload.sub!,
          issuer: payload.iss!,
          audience: Array.isArray(payload.aud) ? payload.aud : [payload.aud!],
          expiresAt: new Date(payload.exp!),
          issuedAt: new Date(payload.iat!),
          jti: payload.jti!,
        })
      })
    } catch (e: unknown) {
      this.logger.warn(e)
      const cause = e instanceof Error ? e.message : String(e)
      return Err(errorFactory.app('InvalidAccessToken', 'unauthorized', { cause }))
    }
  }

  /**
   * Validates mandatory JWT payload claims.
   * @param {JWTPayload} payload JWT payload to validate.
   * @returns {Result<void, InvalidAccessToken>} when token is invalid
   */
  private validateToken(payload: JWTPayload): Result<void, InvalidAccessToken> {
    const errorResponse = (message: string) =>
      Err(errorFactory.app('InvalidAccessToken', 'unauthorized', { message }))
    if (!payload.sub) return errorResponse('No Subject')
    if (!payload.iss) return errorResponse('No Issuer')
    if (!payload.aud) return errorResponse('No Audience')
    if (!payload.exp) return errorResponse('No Expiration')
    if (!payload.iat) return errorResponse('No Issued At')
    if (!payload.jti) return errorResponse('No Id')

    return Ok(undefined)
  }
}
