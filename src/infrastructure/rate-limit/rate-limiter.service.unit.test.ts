import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Redis } from 'ioredis'

import {
  rateLimitPolicies,
  LimiterPolicy,
} from '@api/middlewares/rate-limit/rate-limit-policies.js'

import { RateLimiterService } from './rate-limiter.service.js'

const testState = {
  ctorCalls: [] as unknown[],
  consumeMock: vi.fn(),
}

vi.mock('rate-limiter-flexible', () => {
  /**
   * Test double for RateLimiterRedis capturing constructor configs and delegating consume calls to the shared mock.
   */
  class RateLimiterRedisMock {
    constructor(cfg: unknown) {
      testState.ctorCalls.push(cfg)
    }
    consume = testState.consumeMock
  }
  return { RateLimiterRedis: RateLimiterRedisMock, RateLimiterRes: class {} }
})

const fakeRedis = {} as unknown as Redis

describe('RateLimiterService.consume()', () => {
  beforeEach(() => {
    testState.ctorCalls.length = 0
    testState.consumeMock.mockReset()
  })

  it('constructs limiters for all defined policies with distinct key prefixes', () => {
    const svc = new RateLimiterService(fakeRedis)
    // Expect one constructor call per defined policy.
    const policyKeys = Object.keys(rateLimitPolicies)
    expect(testState.ctorCalls.length).toBe(policyKeys.length)
    // Extract key prefixes from calls.
    const prefixes = testState.ctorCalls.map((c) => (c as { keyPrefix?: string }).keyPrefix)
    // Ensure unique prefixes.
    expect(new Set(prefixes).size).toBe(prefixes.length)
    // Known prefixes we specified in service implementation.
    expect(prefixes).toEqual(expect.arrayContaining(['rl:ga', 'rl:gu', 'rl:cua', 'rl:cub']))
    // Use svc to avoid eslint unused variable warning.
    expect(svc).toBeInstanceOf(RateLimiterService)
  })

  it('returns Ok with RateLimiterRes when consumption succeeds', async () => {
    const svc = new RateLimiterService(fakeRedis)
    const mockRes = { remainingPoints: 42, consumedPoints: 1, msBeforeNext: 1234 }
    testState.consumeMock.mockResolvedValueOnce(mockRes)

    const result = await svc.consume('generalAnon', 'ip:1.1.1.1')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe(mockRes)
      expect(result.value.remainingPoints).toBe(42)
    }
    expect(testState.consumeMock).toHaveBeenCalledWith('ip:1.1.1.1')
  })

  it('returns Err UnknownRateLimitPolicy when internal limiter map lacks policy', async () => {
    const svc = new RateLimiterService(fakeRedis)
    // Simulate missing limiter by deleting one entry manually.
    // @ts-expect-error accessing private field for test purposes.
    delete svc.limiters.generalAnon

    // Cast arbitrary string to LimiterPolicy to bypass type restriction for negative test.
    const result = await svc.consume('generalAnon' as LimiterPolicy, 'ip:2.2.2.2')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('UnknownRateLimitPolicy')
      expect(result.error.category).toBe('internal_error')
    }
    expect(testState.consumeMock).not.toHaveBeenCalled()
  })

  it('returns Err RateLimitUnavailable on underlying consume exception', async () => {
    const svc = new RateLimiterService(fakeRedis)
    testState.consumeMock.mockRejectedValueOnce(new Error('redis-down'))

    const result = await svc.consume('generalAuth', 'user:abc')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('RateLimitUnavailable')
      expect(result.error.category).toBe('unavailable')
      expect(result.error.cause).toContain('redis-down')
    }
  })
})
