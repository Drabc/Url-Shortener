import { BaseInfrastructureError } from './base-infrastructure.error.js'

export type InsertError = BaseInfrastructureError<'UniqueViolation' | 'UnableToInsert'>
export type RateLimitError = BaseInfrastructureError<
  'RateLimitExceeded' | 'UnknownRateLimitPolicy' | 'RateLimitUnavailable'
>

export type InfrastructureError = InsertError | RateLimitError
