import { BaseDomainError } from './base-domain.error.js'

export type UnableToSave = BaseDomainError<'UnableToSave'>
export type DuplicateCodeError = BaseDomainError<'DuplicateCode'>
export type CodeError = BaseDomainError<'ImmutableCode'> | DuplicateCodeError | UnableToSave
export type SessionError = BaseDomainError<'SessionError'>

export type SaveUserError = BaseDomainError<'DuplicateUser'> | UnableToSave

export type SaveEntityError = SaveUserError

export type RepositoryError = CodeError | SessionError | SaveEntityError
