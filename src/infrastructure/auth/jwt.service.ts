import { randomUUID } from 'crypto'

import { CryptoKey, JWTPayload, SignJWT, jwtVerify } from 'jose'
import { Logger } from 'pino'

import { IJwtIssuer } from '@application/ports/jwt-issuer.js'
import { Clock } from '@application/shared/clock.js'
import { IJwtVerifier, VerifiedJwt } from '@application/ports/jwt-verifier.js'
import { InvalidAccessToken } from '@application/errors/invalid-access-token.error.js'

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
  async verify(jwt: string): Promise<VerifiedJwt | null> {
    try {
      const { payload } = await this.verifier(jwt, this.publicKey)

      this.validateToken(payload)

      return {
        subject: payload.sub!,
        issuer: payload.iss!,
        audience: Array.isArray(payload.aud) ? payload.aud : [payload.aud!],
        expiresAt: new Date(payload.exp!),
        issuedAt: new Date(payload.iat!),
        jti: payload.jti!,
      }
    } catch (e: unknown) {
      this.logger.warn(e)
      return null
    }
  }

  /**
   * Validates mandatory JWT payload claims.
   * @param {JWTPayload} payload JWT payload to validate.
   * @throws {InvalidAccessToken} If any required claim is missing.
   */
  private validateToken(payload: JWTPayload) {
    if (!payload.sub) throw new InvalidAccessToken('No Subject')
    if (!payload.iss) throw new InvalidAccessToken('No Issuer')
    if (!payload.aud) throw new InvalidAccessToken('No Audience')
    if (!payload.exp) throw new InvalidAccessToken('No Expiration')
    if (!payload.iat) throw new InvalidAccessToken('No Issued At')
    if (!payload.jti) throw new InvalidAccessToken('No Id')
  }
}
