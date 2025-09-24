import { NextFunction, Request, Response, RequestHandler } from 'express'

import { IJwtVerifier } from '@application/ports/jwt-verifier.js'
import { UnauthorizedError } from '@application/errors/unauthorized.error.js'

declare module 'express' {
  interface Request {
    userId?: string
  }
}

/**
 * Middleware enforcing that a valid Bearer token is provided.
 * Extracts the user id (subject) from the JWT and attaches it to req.userId.
 * Responds 401 on missing/invalid token.
 * @param {IJwtVerifier} verifier JWT verifier service.
 * @returns {RequestHandler} Express middleware.
 */
export function requireAuth(verifier: IJwtVerifier): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const unauthorized = () => next(new UnauthorizedError())
    try {
      const header = req.header('authorization') || req.header('Authorization')
      if (!header || !header.toLowerCase().startsWith('bearer ')) return unauthorized()
      const token = header.slice(7).trim()
      if (!token) return unauthorized()
      const verified = await verifier.verify(token)
      if (!verified) return unauthorized()
      req.userId = verified.subject
      return next()
    } catch {
      return unauthorized()
    }
  }
}
