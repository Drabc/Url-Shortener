import { BaseDomainError } from './base-domain.error.js'
import { RepositoryError } from './repository.error.js'

export type DomainError = BaseDomainError<'InvalidSession'> | RepositoryError
