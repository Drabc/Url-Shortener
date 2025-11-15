import type { Request } from 'express'

import { LimiterPolicy } from './rate-limit-policies.js'

export type RateLimitPolicyPicker = (req: Request) => LimiterPolicy

export const pickGeneral: RateLimitPolicyPicker = (req: Request) =>
  req.userId ? 'generalAuth' : 'generalAnon'

export const pickCreateUrl: RateLimitPolicyPicker = (req: Request) =>
  req.userId ? 'createUrlAuth' : 'createUrlAnon'
