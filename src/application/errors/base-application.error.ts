import { BaseErrorV2 } from '@shared/errors.js'

export type BaseApplicationError<T extends string> = BaseErrorV2<'application', T>

export type ApplicationError = BaseApplicationError<'InvalidSession'>
