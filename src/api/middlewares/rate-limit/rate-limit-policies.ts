export type LimiterPolicy = 'generalAnon' | 'generalAuth' | 'createUrlAnon' | 'createUrlAuth'
type RateLimitPolicy = { points: number; duration: number }

export const rateLimitPolicies: Record<LimiterPolicy, RateLimitPolicy> = {
  generalAnon: { points: 100, duration: 15 * 60 },
  generalAuth: { points: 1000, duration: 15 * 60 },
  createUrlAnon: { points: 5, duration: 60 * 60 },
  createUrlAuth: { points: 60, duration: 60 * 60 },
}
