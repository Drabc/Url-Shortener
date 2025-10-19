import { BaseResultError } from '@shared/errors.js'

export type BaseApplicationError<T extends string> = BaseResultError<'application', T>
