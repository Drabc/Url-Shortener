import { BaseResultError } from '@shared/errors.js'

export type BaseInfrastructureError<T extends string> = BaseResultError<'infra', T>
