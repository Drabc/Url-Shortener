import type { Handler, NextFunction, Request, Response } from 'express'

import { RateLimiterService } from '@infrastructure/rate-limit/rate-limiter.service.js'
import { respondWithError } from '@api/utils/respond.js'
import { RateLimitPolicyPicker } from '@api/middlewares/rate-limit/helpers.js'

export const createRateLimitMiddlewareFactory = (service: RateLimiterService) => {
  return (policyPicker: RateLimitPolicyPicker): Handler => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = req.userId ? `user:${req.userId}` : `ip:${req.ip}`

      const result = await service.consume(policyPicker(req), key)

      if (result.ok) {
        res.setHeader('X-RateLimit-Remaining', result.value.remainingPoints.toString())
        next()
      } else {
        respondWithError(res, result.error)
      }
    }
  }
}
