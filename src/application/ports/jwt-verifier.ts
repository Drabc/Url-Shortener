import { InvalidAccessToken } from '@application/errors/index.js'
import { AsyncResult } from '@shared/result.js'

export type VerifiedJwt = {
  subject: string
  issuer: string
  audience: string[]
  expiresAt: Date
  issuedAt: Date
  jti: string
}

export interface IJwtVerifier {
  verify(jwt: string): AsyncResult<VerifiedJwt | null, InvalidAccessToken>
}
