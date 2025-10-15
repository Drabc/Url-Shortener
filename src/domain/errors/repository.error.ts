import { BaseDomainError } from './base-domain.error.js'

export type DuplicateCodeError = BaseDomainError<'DuplicateCode'>
export type CodeError = BaseDomainError<'ImmutableCode' | 'UnableToSave'> | DuplicateCodeError
export type SessionError = BaseDomainError<'SessionError'>

export type RepositoryError = CodeError | SessionError
