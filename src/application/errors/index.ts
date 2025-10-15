import { CodeError } from '@domain/errors/repository.error.js'

import { BaseApplicationError } from './base-application.error.js'

export type ShortenError = BaseApplicationError<'MaxCodeGenerationAttemptsError'> | CodeError
export type ResourceNotFoundError = BaseApplicationError<'ResourceNotFound'>

export type ApplicationError =
  | BaseApplicationError<'InvalidSession' | 'InvalidCredentials'>
  | ShortenError
  | ResourceNotFoundError
