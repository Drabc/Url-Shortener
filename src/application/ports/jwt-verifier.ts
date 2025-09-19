export type VerifiedJwt = {
  subject: string
  issuer: string
  audience: string[]
  expiresAt: Date
  issuedAt: Date
  jti: string
}

export interface IJwtVerifier {
  verify(jwt: string): Promise<VerifiedJwt | null>
}
