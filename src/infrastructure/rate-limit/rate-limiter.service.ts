import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible'
import type { Redis } from 'ioredis'

import {
  LimiterPolicy,
  rateLimitPolicies,
} from '@api/middlewares/rate-limit/rate-limit-policies.js'
import { AsyncResult, Err, Ok } from '@shared/result.js'
import { RateLimitError } from '@infrastructure/errors/index.js'
import { errorFactory } from '@shared/errors.js'

type LimiterMap = Record<LimiterPolicy, RateLimiterRedis>

/**
 * Service wrapping multiple Redis-backed rate limiters keyed by predefined policies.
 * @class RateLimiterService
 * @param {Redis} redis Redis client instance used as the backend store.
 * @param {typeof rateLimitPolicies} policies Collection of rate limit policies (defaults to rateLimitPolicies).
 */
export class RateLimiterService {
  private readonly limiters: LimiterMap

  constructor(redis: Redis, policies: typeof rateLimitPolicies = rateLimitPolicies) {
    this.limiters = {
      generalAnon: new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: 'rl:ga',
        ...policies.generalAnon,
      }),
      generalAuth: new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: 'rl:gu',
        ...policies.generalAuth,
      }),
      createUrlAnon: new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: 'rl:cua',
        ...policies.createUrlAnon,
      }),
      createUrlAuth: new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: 'rl:cub',
        ...policies.createUrlAuth,
      }),
    }
  }

  /**
   * Consume a single point for the provided rate limit policy and key.
   * @param {LimiterPolicy} policy Rate limit policy identifier.
   * @param {string} key Unique key to rate limit (e.g. IP address or user id).
   * @returns {AsyncResult<RateLimiterRes, RateLimitError>} Result indicating success or rate limit error.
   */
  async consume(policy: LimiterPolicy, key: string): AsyncResult<RateLimiterRes, RateLimitError> {
    try {
      const limiter = this.limiters[policy]
      if (!limiter)
        return Err(
          errorFactory.infra('UnknownRateLimitPolicy', 'internal_error', {
            cause: `Unknown Rate limit policy ${policy}`,
          }),
        )

      const response = await limiter.consume(key)
      return Ok(response)
    } catch (e: unknown) {
      if (e instanceof RateLimiterRes) {
        const secondsBefore = Math.ceil(e.msBeforeNext / 1000)
        return Err(
          errorFactory.infra('RateLimitExceeded', 'rate_limited', {
            message: `Rate Limit Exceeded. Try again after ${secondsBefore} seconds`,
          }),
        )
      }

      const cause = e instanceof Error ? e.message : String(e)

      return Err(
        errorFactory.infra('RateLimitUnavailable', 'unavailable', {
          message: 'Rate limiting service is unavailable',
          cause,
        }),
      )
    }
  }
}
