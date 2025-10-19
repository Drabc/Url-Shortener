import { BaseResultError } from '@shared/errors.js'

export type BaseDomainError<T extends string> = BaseResultError<'domain', T>
