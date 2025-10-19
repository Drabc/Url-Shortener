import { BaseInfrastructureError } from './base-infrastructure.error.js'

export type InsertError = BaseInfrastructureError<'UniqueViolation' | 'UnableToInsert'>

export type InfrastructureError = InsertError
