import { BaseDomainError } from './base-domain.error.js'
import { RepositoryError } from './repository.error.js'

export type InvalidValue = BaseDomainError<'InvalidValue'>
export type InvalidPasswordTime = BaseDomainError<'InvalidPasswordTime'>
export type InvalidEmail = BaseDomainError<'InvalidEmail'>
export type InvalidSession = BaseDomainError<'InvalidSession'>
export type InvalidUrl = BaseDomainError<'InvalidUrl'> | InvalidValue
export type InvalidPassword = BaseDomainError<'InvalidPassword'>

export type DomainValidationError =
  | InvalidValue
  | InvalidPasswordTime
  | InvalidEmail
  | InvalidSession
  | InvalidUrl
  | InvalidPassword

export type DomainError = DomainValidationError | RepositoryError
