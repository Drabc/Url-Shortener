import { User } from '@domain/entities/user.js'
import { DomainValidationError } from '@domain/errors/index.js'
import { RepositoryError } from '@domain/errors/repository.error.js'
import { AsyncResult } from '@shared/result.js'

export interface IUserRepository {
  findById(id: string): AsyncResult<User | null, DomainValidationError>
  findByEmail(email: string): AsyncResult<User | null, DomainValidationError>
  save(user: User): AsyncResult<void, RepositoryError>
}
