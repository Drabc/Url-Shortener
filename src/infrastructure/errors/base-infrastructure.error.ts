import { BaseErrorV2 } from '@shared/errors.js'

export type BaseInfrastructureError<T extends string> = BaseErrorV2<'infra', T>
