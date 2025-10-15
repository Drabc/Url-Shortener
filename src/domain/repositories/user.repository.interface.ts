import { User } from '@domain/entities/user.js'
import { RepositoryError } from '@domain/errors/repository.error.js'
import { AsyncResult } from '@shared/result.js'

export interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  save(user: User): AsyncResult<void, RepositoryError>
}
