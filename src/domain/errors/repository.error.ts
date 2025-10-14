import { BaseDomainError } from './base-domain.error.js'

export type CodeError = BaseDomainError<'ImmutableCode' | 'UnableToSave' | 'DuplicateCode'>

export type RepositoryError = CodeError
