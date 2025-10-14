import { BaseErrorV2 } from '@shared/errors.js'

export type BaseDomainError<T extends string> = BaseErrorV2<'domain', T>
